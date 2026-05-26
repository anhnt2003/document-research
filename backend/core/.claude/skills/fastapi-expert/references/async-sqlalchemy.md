# SQLAlchemy 2.0 async in `backend/core`

This service uses **SQLAlchemy 2.0 async** with the `psycopg` v3 driver. The DSN scheme is `postgresql+psycopg://...` — note `psycopg`, not `psycopg2` and not `asyncpg`. Stick with one driver; mixing causes pool/dialect confusion.

## Hard constraint: no schema mutations

`backend/api/` (EF Core) owns the Postgres schema. From here you may:

- `select`, `insert`, `update`, `delete` against existing tables
- Read column types, run vector queries, JOINs, CTEs
- Use existing indexes

You may **not**:

- Call `Base.metadata.create_all(engine)` or `…drop_all(…)`
- Configure Alembic, write migration files, or `op.execute("CREATE …")`
- Issue `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX` (including pgvector indexes) at runtime
- Define new mapped classes that the API service doesn't already know about

If a feature needs new structure, stop and ask the user to add the migration in `backend/api/`. Reflect the existing table or write a typed mapped class that mirrors what EF Core created.

## Engine + session setup

One engine, one sessionmaker, module-level — both should be created from `core.config.settings.database_url`.

```python
# src/core/db.py
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.config import settings

engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,  # critical: prevents implicit lazy-load after commit
    class_=AsyncSession,
)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
```

`expire_on_commit=False` is non-negotiable in async code. With the default `True`, accessing any attribute after `await session.commit()` triggers a lazy refresh that explodes with `MissingGreenlet`. The session context manager handles rollback on exception and close on exit — don't manually call `session.close()` in request paths.

## Declarative models (mirror EF Core, never define new tables)

```python
# src/core/models/document.py
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"          # MUST match the EF Core migration
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    body: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

Use `Mapped[...]` annotations — they're how 2.0 typing works and they satisfy mypy strict. Mark nullable columns as `Mapped[str | None]`; don't lean on `nullable=True` alone.

## Querying — the 2.0 style

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.document import Document


async def get_by_id(db: AsyncSession, doc_id: int) -> Document | None:
    result = await db.execute(select(Document).where(Document.id == doc_id))
    return result.scalar_one_or_none()


async def list_recent(db: AsyncSession, limit: int = 20) -> list[Document]:
    stmt = select(Document).order_by(Document.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())
```

Result-shape helpers:

| Need | Call |
| --- | --- |
| exactly one row, fail if 0 or >1 | `result.scalar_one()` |
| at most one row | `result.scalar_one_or_none()` |
| iterate rows of one entity | `result.scalars().all()` / `.first()` |
| iterate rows of multiple selected things | `result.all()` / `result.tuples()` |
| just a count / scalar value | `await db.scalar(select(func.count()).…)` |

Avoid `db.query(...)` (the 1.x Query API) — it's deprecated and breaks under async sessions.

## Writes

```python
async def create(db: AsyncSession, title: str, body: str) -> Document:
    doc = Document(title=title, body=body)
    db.add(doc)
    await db.flush()        # populates doc.id without committing
    await db.commit()
    await db.refresh(doc)   # only if you need server-generated cols past id
    return doc
```

- Prefer `flush()` + `commit()` for the create-then-return pattern.
- `await db.refresh(obj)` reloads the row from the DB; needed for columns with `server_default`/`onupdate`.
- Bulk insert: `await db.execute(insert(Document), [{...}, {...}])`. Don't loop `db.add()` for hundreds of rows.

## Relationships and N+1

Async sessions cannot lazy-load. Either eager-load with a loader option or access attributes only after explicit await:

```python
from sqlalchemy.orm import selectinload

stmt = select(Document).options(selectinload(Document.chunks))
result = await db.execute(stmt)
docs = list(result.scalars().all())
for d in docs:
    print(d.chunks)  # already loaded, no implicit IO
```

- `selectinload` — one extra `WHERE id IN (...)` query, works well for to-many.
- `joinedload` — single query with LEFT OUTER JOIN, good for to-one.
- `raiseload` on relationships is a useful guard in tests to surface accidental lazy-loads.

## Transactions

The session is already in an implicit transaction when you start writing. Two patterns:

```python
# 1) Simple — one commit at the end of the unit of work
async def transfer(db: AsyncSession, ...) -> None:
    ...
    await db.commit()

# 2) Explicit nested block — useful inside a service that gets a session passed in
async with db.begin():     # commits on exit, rolls back on exception
    ...
```

Don't mix `db.begin()` with manual `db.commit()`/`db.rollback()` in the same block.

## Raw SQL when ORM is in the way

Always `text()`, always bound parameters — never string-format user input.

```python
from sqlalchemy import text

result = await db.execute(
    text("SELECT id, title FROM documents WHERE title ILIKE :q LIMIT :n"),
    {"q": f"%{query}%", "n": limit},
)
rows = result.mappings().all()  # list of dict-likes
```

## Common mistakes to refuse

- `from sqlalchemy.orm import Session` in async code — that's the sync session class.
- `engine.execute(...)` — gone in 2.0; use `async with engine.connect() as conn: await conn.execute(...)`.
- Forgetting `expire_on_commit=False` and then puzzling over `MissingGreenlet`.
- Accessing a relationship without `selectinload`/`joinedload` and praying — it will explode in async.
- Catching `Exception` after `commit()` and swallowing it — let it propagate so the session context manager rolls back.
