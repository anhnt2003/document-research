# pgvector in `backend/core`

`pgvector` is this project's vector store. The extension is enabled at container init by `scripts/db-init/00-pgvector.sql`. The Python binding is `pgvector` (already a runtime dep).

## Schema ownership reminder

The `vector(N)` columns and any ANN indexes (`HNSW`, `IVFFlat`) belong to `backend/api/` migrations. From here you only **query** existing vector columns. If the index is missing, kNN queries will fall back to sequential scan — flag this to the user as something to add to the EF Core migration, do **not** issue `CREATE INDEX` from Python.

The reference table below describes columns this code may read or write, assuming they were created by an EF Core migration like:

```sql
CREATE EXTENSION IF NOT EXISTS vector;            -- already present
ALTER TABLE chunks ADD COLUMN embedding vector(1536);
CREATE INDEX chunks_embedding_hnsw_idx ON chunks
    USING hnsw (embedding vector_cosine_ops);
```

## Mapping the column

```python
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import Mapped, mapped_column

from core.models.document import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int]
    content: Mapped[str]
    # Dimension MUST match what the migration declared.
    embedding: Mapped[list[float]] = mapped_column(Vector(1536))
```

Always keep the embedding dimension in one place — pull it from `settings` if you ever change embedders, so the schema/binding/embedder all agree.

## Distance operators

pgvector exposes three SQL operators. Pick one and stick with it per index; an HNSW index built with `vector_cosine_ops` only accelerates `<=>` queries.

| Operator | SQLAlchemy method | Distance metric | Operator class for index |
| --- | --- | --- | --- |
| `<->` | `.l2_distance(v)` | Euclidean (L2) | `vector_l2_ops` |
| `<#>` | `.max_inner_product(v)` | negative inner product | `vector_ip_ops` |
| `<=>` | `.cosine_distance(v)` | cosine distance (0 = identical) | `vector_cosine_ops` |

For semantic search over normalized embeddings, cosine distance is the usual choice.

## kNN query

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.chunk import Chunk


async def nearest_chunks(
    db: AsyncSession, query_embedding: list[float], k: int = 5
) -> list[tuple[Chunk, float]]:
    stmt = (
        select(
            Chunk,
            Chunk.embedding.cosine_distance(query_embedding).label("distance"),
        )
        .order_by(Chunk.embedding.cosine_distance(query_embedding))
        .limit(k)
    )
    result = await db.execute(stmt)
    return [(row.Chunk, row.distance) for row in result.all()]
```

Notes:

- The `.cosine_distance(...)` expression in `ORDER BY` is what lets the ANN index kick in. If you wrap it in `1 - …` or filter on `distance < …` *before* ordering, the planner may skip the index.
- For ANN with a `WHERE` filter (e.g. tenant/user scope), test the plan — small filtered sets often beat ANN, while large ones need a partial index that the API service must add.

## Tuning kNN search at query time

`hnsw.ef_search` (for HNSW) or `ivfflat.probes` (for IVFFlat) trade recall for latency. Set them per-session via `SET LOCAL`:

```python
from sqlalchemy import text

await db.execute(text("SET LOCAL hnsw.ef_search = 100"))
# … then run the kNN query in the same transaction
```

Keep this scoped (`SET LOCAL`, not `SET`) so it doesn't leak across pooled connections.

## Combining lexical + vector (hybrid search)

A practical pattern is a UNION/CTE that blends `tsvector` ranking with vector distance. Express it as raw `text(...)` if it's cleaner than ORM expressions — readability wins.

```python
from sqlalchemy import text

stmt = text("""
    WITH semantic AS (
        SELECT id, 1 - (embedding <=> :q_emb) AS score
        FROM chunks
        ORDER BY embedding <=> :q_emb
        LIMIT 50
    ),
    lexical AS (
        SELECT id, ts_rank(to_tsvector('simple', content), plainto_tsquery(:q_text)) AS score
        FROM chunks
        WHERE to_tsvector('simple', content) @@ plainto_tsquery(:q_text)
        ORDER BY score DESC
        LIMIT 50
    )
    SELECT id, MAX(score) AS score
    FROM (SELECT * FROM semantic UNION ALL SELECT * FROM lexical) u
    GROUP BY id ORDER BY score DESC LIMIT :k
""")
result = await db.execute(stmt, {"q_emb": query_embedding, "q_text": query_text, "k": k})
```

Bind params, never string interpolation.

## Common mistakes to refuse

- `from pgvector.psycopg2 import register_vector` — wrong driver. With `psycopg` v3 + SQLAlchemy `Vector` type, registration happens via the type adapter; you don't need manual registration in this stack.
- Passing a NumPy array directly to a bound parameter without converting to `list[float]` first — driver-dependent and brittle.
- Building an embedding query that does cosine *similarity* (`1 - distance`) inside `ORDER BY` — order by the distance, then convert in the SELECT/output mapping.
- Writing `CREATE INDEX … USING hnsw …` from Python at startup. That's a schema mutation — belongs in the EF Core migration on `backend/api/`.
