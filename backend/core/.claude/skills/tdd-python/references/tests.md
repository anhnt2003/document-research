# Tests — Python (`backend/core/`)

Stack: Python 3.11, FastAPI, SQLAlchemy 2.0 async, pytest 9, pytest-asyncio (`asyncio_mode = "auto"`), mypy strict, ruff. Package manager is **uv** — never `pip install`.

## Commands

```bash
cd backend/core
uv run pytest                                 # full suite
uv run pytest tests/test_search.py            # one file
uv run pytest -k "returns_empty_list"         # name filter
uv run pytest -x -vv                          # stop on first fail, verbose
uv run ruff check . && uv run mypy src        # lint + type-check (part of verify)
```

`tool.pytest.ini_options` already sets `asyncio_mode = "auto"` and `pythonpath = ["src"]`, so async test functions don't need `@pytest.mark.asyncio` and imports can be `from core....`.

## Test layering

Prefer the highest layer that still gives a fast, deterministic test. Roughly:

1. **HTTP integration test** — `httpx.AsyncClient` against the FastAPI app via `ASGITransport`. Covers routing, dependency injection, the route handler, services, and the DB layer. Default for endpoint behavior.
2. **Service / function test** — call the async function directly with a real (or in-memory) dependency. Use when behavior is pure logic, or when the endpoint test would be too coarse to pin down the case.
3. **Unit test of a pure helper** — rare. Reserve for parsers, formatters, embedding-vector math, etc., where the contract is obvious from inputs/outputs.

## Naming

Function name = the behavior, in snake_case:

- `test_search_returns_empty_list_when_query_is_blank`
- `test_post_document_returns_201_when_payload_valid`
- `test_get_document_returns_404_when_id_does_not_exist`

Anti-patterns: `test_search_works`, `test_calls_embed_once`, `test_method_x`.

## Good test (HTTP integration with FastAPI)

```python
import pytest
from httpx import ASGITransport, AsyncClient

from core.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_search_returns_empty_list_when_query_is_blank(client: AsyncClient):
    response = await client.post("/search", json={"query": ""})

    assert response.status_code == 200
    assert response.json() == {"results": []}


async def test_search_returns_200_with_results_when_query_matches(
    client: AsyncClient, seed_documents
):
    response = await client.post("/search", json={"query": "rfc"})

    assert response.status_code == 200
    titles = [r["title"] for r in response.json()["results"]]
    assert "RFC 7231" in titles
```

What this test does *not* do: it doesn't mock `embed()`, doesn't peek at the SQLAlchemy session, doesn't assert that the search service was called once. It treats the API as a black box that takes a query and returns matching documents.

`TestClient` from `fastapi.testclient` is also fine for synchronous test bodies, but the rest of this codebase is async — prefer `httpx.AsyncClient` + `ASGITransport` for consistency.

## Bad test (coupled to implementation)

```python
# ❌ Don't do this
from unittest.mock import AsyncMock

async def test_search_calls_embed_once():
    embed = AsyncMock(return_value=[0.1] * 1536)
    service = SearchService(embed=embed, repo=AsyncMock())

    await service.search("rfc")

    embed.assert_awaited_once_with("rfc")
```

Problems:
- Asserts on the call, not on the result. You can change `embed` to be batched, cached, or replaced entirely and the user-visible behavior is unchanged — but this test breaks.
- Mocks the repository the service owns. Now the test passes even if the SQL is broken.
- Locks in the constructor signature. Renaming the parameter or extracting a strategy object will fail this test for no behavioral reason.

## Database

This project uses Postgres + pgvector. **Do not migrate from `backend/core/`** — `backend/api/` is the schema owner.

For tests, two reasonable approaches:

1. Reuse the running `docker compose` Postgres with a separate test schema (or test DB name), and rely on EF Core migrations from `backend/api/` to have already created the tables. Wrap each test in a transaction that's rolled back at the end so tests stay independent.
2. Use `testcontainers[postgres]` with the `pgvector/pgvector:pg17` image, then run the migrations once at session scope via `dotnet ef database update` against the test container. Slower but fully hermetic.

Pick (1) for fast local iteration, (2) for CI determinism.

Don't use SQLite for tests of pgvector behavior — the dialects diverge enough to produce false greens.

## Async

`asyncio_mode = "auto"` is already on, so:

- Async test functions don't need the `@pytest.mark.asyncio` decorator
- Async fixtures need `@pytest.fixture` (mixing async + non-function scope requires `pytest-asyncio`-aware setup; check the docs if you go there)
- Never call `asyncio.run` inside a test — pytest-asyncio runs the loop for you

## Parameterised cases

```python
@pytest.mark.parametrize(
    "query, expected_status",
    [
        ("", 200),         # blank → empty result
        ("   ", 200),      # whitespace → empty result
        ("rfc", 200),      # real query → 200 + results
    ],
)
async def test_search_status_for_various_queries(client, query, expected_status):
    response = await client.post("/search", json={"query": query})
    assert response.status_code == expected_status
```

If different inputs need different assertions, split into separate test functions. Compression that hides the assertion is worse than three small tests.

## Type checking

`mypy --strict` is part of the project's quality bar. Keep type annotations on test fixtures and helpers — the test suite is also code, and strict typing catches surprisingly real bugs (wrong DTO shape, awaited the wrong thing) before they show up at runtime.

## What to read next

- [mocking.md](mocking.md) — what to mock in Python (only external systems: Anthropic API, time, randomness).
- [interface-design.md](interface-design.md) — designing FastAPI handlers and services for testability.
- [refactoring.md](refactoring.md) — refactor candidates after the slice is green.
