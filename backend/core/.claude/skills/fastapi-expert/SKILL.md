---
name: fastapi-expert
description: Use whenever you write or modify async Python code inside `backend/core/` — adding FastAPI routes, Pydantic V2 schemas, SQLAlchemy 2.0 async queries, pgvector similarity search, Anthropic LLM calls, dependency-injected services, or pytest-asyncio tests. Trigger even if the user just says "add an endpoint", "new route", "search by embedding", "call the LLM", "validate input", "write a query", or names a file in `src/core/`. Encodes this project's hard rules — uv-only, mypy-strict, async-only I/O, Pydantic Settings via `core.config`, and the critical constraint that schema/migrations are owned by `backend/api/` (EF Core), never written here.
metadata:
  scope: backend/core
  stack: FastAPI + Pydantic V2 + SQLAlchemy 2.0 async + psycopg v3 + pgvector + Anthropic SDK
  python: "3.11"
---

# FastAPI Expert — `backend/core`

You are working inside the FastAPI + LLM + semantic-search service of this monorepo. The patterns below are not generic FastAPI advice — they are the conventions this codebase has already committed to. Stay inside them.

## Project rules you cannot violate

These come from `backend/core/CLAUDE.md` and the root `CLAUDE.md`. Internalize them before writing code.

1. **No schema, no migrations from here.** `backend/api/` (.NET 10 + EF Core) is the sole owner of the Postgres schema. If a feature needs a new table, column, or index, stop and tell the user to add it via an EF Core migration in `backend/api/`. Do **not** create `Base.metadata.create_all`, Alembic configs, raw `CREATE TABLE`, or any code path that would mutate schema. `backend/core` only reads from / writes rows to tables that already exist.
2. **`uv` is the only package manager.** Never suggest `pip install`, `poetry add`, `pipenv`, or hand-edit `requirements.txt`. Use `uv add <pkg>` for runtime deps, `uv add --dev <pkg>` for dev deps. Run everything through `uv run …`.
3. **Async/await on every I/O path.** SQLAlchemy → `AsyncSession`. HTTP → `httpx.AsyncClient` (already a dev dep; if you need it at runtime, `uv add httpx`). LLM calls → `anthropic.AsyncAnthropic`. Mixing sync I/O into an async route will silently block the event loop — refuse to write `requests`, `psycopg2`, sync `Session`, or `time.sleep` in request paths.
4. **Configuration through `core.config.settings`.** All env-driven values flow through the Pydantic Settings instance. Do not call `os.environ[...]`, `os.getenv(...)`, or read `.env` files directly in feature code. If you need a new setting, add a typed field to `Settings` in `src/core/config.py`.
5. **mypy strict is on.** Every function needs a complete type signature including return type. Use `X | None`, not `Optional[X]`. Use built-in generics (`list[str]`, `dict[str, int]`), not `typing.List`. Use `Annotated[T, Depends(...)]` for dependency injection.
6. **Absolute imports from `core.*`.** `pythonpath = ["src"]` is set in `pyproject.toml`, so import as `from core.config import settings` — never `from src.core...` and never relative imports across module boundaries.
7. **Python 3.11 syntax only.** `match`/`case`, `X | Y` unions, `Self`, `Required`/`NotRequired` from `typing` are fine. PEP 695 type-alias syntax (`type Foo = ...`) is 3.12+ — do not use it.

If a user request would require breaking any of these (e.g. "add a new table"), say so plainly and ask how they want to proceed instead of silently working around it.

## Workflow

1. **Read before you write.** Open `src/core/main.py`, `src/core/config.py`, and any neighbour modules that already do the thing you're about to add. Match the existing shape rather than introducing a new pattern.
2. **Design the schema first.** A Pydantic V2 request model + response model, with explicit field types and validators. The schema is the contract.
3. **Write the route or service function.** Keep the route thin — argument parsing, dependency injection, status codes. Push business logic into a service/CRUD module so it stays testable without spinning up the ASGI app.
4. **Write the test alongside the code.** `tests/` uses `pytest-asyncio` with `asyncio_mode = "auto"` (configured in `pyproject.toml`), so plain `async def test_…` works — no decorator needed.
5. **Verify locally:**
   ```bash
   cd backend/core
   uv run ruff check .
   uv run mypy src
   uv run pytest
   ```
   All three must be clean before the change is done. mypy strict catches the most subtle issues — don't suppress with `# type: ignore` unless you can explain why in one sentence.

## Minimal complete pattern

A route + schema + async DB call + dependency injection, written the way this project expects:

```python
# src/core/schemas/document.py
from pydantic import BaseModel, ConfigDict, Field


class DocumentQuery(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    query: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=50)


class DocumentHit(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    score: float
```

```python
# src/core/db.py  (engine + session factory — read-only, no schema creation)
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.config import settings

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
```

```python
# src/core/routers/search.py
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_db
from core.schemas.document import DocumentHit, DocumentQuery
from core.services import search as search_service

router = APIRouter(prefix="/search", tags=["search"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.post("/documents", response_model=list[DocumentHit], status_code=status.HTTP_200_OK)
async def search_documents(payload: DocumentQuery, db: DbDep) -> list[DocumentHit]:
    return await search_service.search_documents(db, payload)
```

Key details to notice (and replicate):

- **`Annotated[T, Depends(...)]` once, reuse as alias.** Defining `DbDep` keeps signatures readable across many routes.
- **`response_model=` on every route.** It drives OpenAPI and strips extra fields — don't skip it.
- **Service module owns the SQL.** The router never holds a `select()`; that lives in `core.services.*` or `core.crud.*` so it can be unit-tested with a session fixture.
- **`expire_on_commit=False`** on the session factory — without it, attribute access after commit triggers an implicit lazy-load which throws in async contexts.

## References — load on demand

These live under `references/`. Don't preload them all; open only what the current task touches.

| File | When to load |
| --- | --- |
| `references/pydantic-v2.md` | Writing/validating request or response models, custom validators, `ConfigDict`, discriminated unions |
| `references/async-sqlalchemy.md` | Any `AsyncSession` query, transactions, `selectinload`, session lifecycle |
| `references/pgvector.md` | Embedding columns, similarity search (`<->`, `<=>`, `<#>`), HNSW/IVFFlat indexes (read-only — the index DDL belongs in `backend/api/`) |
| `references/endpoints-routing.md` | `APIRouter` composition, dependency injection patterns, status codes, error handling, background tasks |
| `references/anthropic-llm.md` | Calling Claude via `anthropic.AsyncAnthropic`, streaming, system prompts, token budgets, prompt-caching |
| `references/testing-async.md` | `pytest-asyncio` fixtures, `httpx.AsyncClient` against the app, DB test isolation |
| `references/config-settings.md` | Adding new settings, env-var naming, secrets handling, settings in tests |

## Constraints — quick reference

**Always:**
- Type-hint every function and method, including `-> None` on side-effecting ones.
- Use `Annotated[..., Depends(...)]` for DI; alias common ones (`DbDep`, `CurrentUser`).
- Return explicit `status_code=` on POST (`201`), DELETE (`204`), etc. — don't rely on FastAPI defaults when the semantic differs.
- Strip and validate user input in the Pydantic schema, not in the route body.
- Use `httpx.AsyncClient` + `anthropic.AsyncAnthropic`; close them via lifespan or context managers, never module-level singletons that leak across tests.

**Never:**
- Run sync DB code (`Session`, `psycopg2`, `engine.execute` without `async with`) in a request path.
- Read `os.environ` outside `core.config`.
- Write Alembic migrations, `Base.metadata.create_all`, or raw `CREATE TABLE` — schema is owned by `backend/api/`.
- Use Pydantic V1 syntax (`@validator`, `class Config`, `.dict()`, `.parse_obj()`). It's `@field_validator`, `model_config = ConfigDict(...)`, `.model_dump()`, `.model_validate()`.
- Hardcode secrets, API keys, or connection strings. They go through `Settings`.
- Suppress mypy/ruff warnings without a one-line comment explaining why.

## Output expectations

When you finish a feature, the user should see, in order:

1. The schema file (or diff to an existing one).
2. The router file (or diff).
3. The service/CRUD file if the DB is touched.
4. The test file.
5. The output of `uv run ruff check . && uv run mypy src && uv run pytest` proving it's green.
6. One short paragraph explaining anything non-obvious — a tricky validator, a non-default status code, a deliberate `selectinload`. Skip this if the diff is self-explanatory.
