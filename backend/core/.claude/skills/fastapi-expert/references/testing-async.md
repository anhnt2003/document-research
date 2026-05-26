# Async testing in `backend/core`

`pytest-asyncio` is configured in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
pythonpath = ["src"]
```

That means every `async def test_…` runs in its own event loop with no decorator. `httpx` is in the dev deps, so the standard FastAPI test pattern works out of the box.

## Layout

```
tests/
├── conftest.py              # shared fixtures
├── unit/                    # pure functions, validators — no DB, no HTTP
├── services/                # service-layer tests with a real DB session
└── api/                     # endpoint tests via httpx.AsyncClient against the ASGI app
```

Mirror the `src/core/` layout so the test for `src/core/services/search.py` is `tests/services/test_search.py`.

## Testing endpoints with `httpx.AsyncClient`

Use the in-process ASGI transport — no network, no port, no Uvicorn:

```python
# tests/api/test_health.py
import pytest
from httpx import ASGITransport, AsyncClient

from core.main import app


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_health(client: AsyncClient) -> None:
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
```

Don't use the legacy `TestClient` from `starlette.testclient` — it's sync and will fight with `asyncio_mode = "auto"`.

## Database fixtures

This project shares a Postgres dev DB with `backend/api/`. Two viable strategies for test isolation:

### Strategy A — savepoint per test (preferred when you have a dev DB and want speed)

Open one connection, start a transaction, run the test inside a nested transaction (`SAVEPOINT`), roll the outer transaction back at the end. Nothing persists.

```python
# tests/conftest.py
from collections.abc import AsyncIterator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from core.db import engine


@pytest.fixture
async def db() -> AsyncIterator[AsyncSession]:
    async with engine.connect() as conn:
        trans = await conn.begin()
        Session = async_sessionmaker(bind=conn, expire_on_commit=False)
        async with Session() as session:
            await session.begin_nested()
            try:
                yield session
            finally:
                await trans.rollback()
```

Override `get_db` in the app for endpoint tests:

```python
from core.db import get_db
from core.main import app


@pytest.fixture
async def client(db: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def _override() -> AsyncIterator[AsyncSession]:
        yield db

    app.dependency_overrides[get_db] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

### Strategy B — separate test database

If feature tests need data that survives commits (e.g. testing concurrency or trigger-driven side effects), point `DATABASE_URL` at a dedicated test DB and `TRUNCATE` between tests. This is slower but real. Keep it as the exception, not the default.

**Either way, the test DB schema must already exist** — created by an EF Core migration run against the test database, not by `Base.metadata.create_all`. If a needed table is missing, fix it by running migrations on the test DB, not by calling `create_all` from a fixture.

## Mocking the LLM

Never call the real Anthropic API from tests. Override the dependency to return a fake client:

```python
class FakeAnthropic:
    async def __aenter__(self): return self
    async def __aexit__(self, *a): return None

    class messages:
        @staticmethod
        async def create(**_: object) -> object:
            class _Block:
                type = "text"
                text = "stubbed answer"

            class _Msg:
                content = [_Block()]
                stop_reason = "end_turn"

            return _Msg()


@pytest.fixture
async def client_with_fake_llm() -> AsyncIterator[AsyncClient]:
    from core.deps import get_anthropic
    app.dependency_overrides[get_anthropic] = lambda: FakeAnthropic()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

For richer behavior, mock with `unittest.mock.AsyncMock`. Whatever you do, the test must not hit the real `api.anthropic.com` even when `ANTHROPIC_API_KEY` happens to be set.

## Settings in tests

Use `pytest.MonkeyPatch` to override env / settings, never edit a real `.env`:

```python
async def test_uses_override(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    from core.config import Settings    # build fresh, don't import the cached singleton
    s = Settings()
    assert s.app_env == "test"
```

For code that imports the cached `settings` singleton, monkeypatch the attribute directly:

```python
from core import config
monkeypatch.setattr(config.settings, "llm_model", "claude-haiku-4-5-20251001")
```

## Assertion style

- Assert specific status codes (`assert r.status_code == 201`), not "any 2xx".
- For JSON, assert exact shape on small responses; assert a few load-bearing keys on big ones.
- Avoid asserting on error message strings unless they're stable contracts — codes/keys are.
- One behavior per test. If a test name reads "test\_create\_and\_then\_update\_and\_delete", split it.

## Running

```bash
cd backend/core
uv run pytest                          # all
uv run pytest tests/api -k search      # subset
uv run pytest -x --ff                  # stop on first fail, run failed first
uv run pytest --cov=core --cov-report=term-missing   # if you add pytest-cov
```

A green test alone isn't enough — also run `uv run ruff check .` and `uv run mypy src` before declaring done.

## Common mistakes to refuse

- `from starlette.testclient import TestClient` — sync; clashes with `asyncio_mode = "auto"`.
- Creating a `pytest-asyncio` event-loop fixture by hand — `asyncio_mode = "auto"` already manages it.
- Letting test DB writes leak between tests because the fixture committed instead of rolling back.
- Calling the real Anthropic API or real `backend/api/` service in tests.
- Reaching into `core.config.settings` and mutating it without restoring — use `monkeypatch.setattr`, not bare assignment.
