# Mocking — Python / pytest

The single biggest failure mode in this project's tests is mocking the wrong thing. Apply this rule first; the rest is detail.

## The rule

**Mock at the system boundary, not inside it.**

The "system under test" is the unit whose behavior you care about — usually a FastAPI route handler with the service and async SQLAlchemy session underneath. Anything *outside* that unit is a fair target for substitution when calling it for real would make the test slow, flaky, or expensive. Anything *inside* that unit must run for real, or you're not testing the system, you're testing a sketch of it.

## Mock these (true external systems)

- **Third-party HTTP APIs** — anything talking to a service the team doesn't own. Use `respx` or `httpx.MockTransport` to fake the response. Don't reach for `unittest.mock` to patch your own service module.
- **The Anthropic API** — wrap the SDK behind a thin abstraction (e.g. an injected `AsyncAnthropic` client or a `ClaudeClient` protocol) and substitute the implementation in tests. Don't issue real network calls in unit/integration tests.
- **The wall clock** — inject a `Callable[[], datetime]` (e.g. `now: Callable[[], datetime] = datetime.utcnow`). The test passes a lambda returning a fixed datetime and asserts the exact timestamp.
- **Random / non-deterministic sources** — inject the id generator as a callable. Production wires in `uuid.uuid4`; tests pass a deterministic counter or a fixed-value lambda.
- **The filesystem when scope is broad** — for narrowly-scoped tests, prefer pytest's `tmp_path` fixture; for code that orchestrates many file operations, an `fsspec` / `pyfakefs` filesystem abstraction is fine.

## Do not mock these (internal collaborators)

These live *inside* the system under test. Mocking them produces brittle, hollow tests that lie:

- **The async SQLAlchemy session** — substitute the *database* (run Postgres via `docker compose` or `testcontainers`) rather than mock the session. SQLAlchemy 2.0 async behavior is too rich to mock faithfully; you'll write a fake that passes but production fails.
- **Repositories / services the route handler owns** — `SearchService`, `DocumentRepository`. These are part of how the system delivers its behavior, not an external system. Run them for real against the test DB.
- **Other dependencies injected via FastAPI's `Depends()`** — if the route depends on `get_search_service`, the test should let the real service run. Substitute only at the genuinely-external seams *inside* the service (the Anthropic call, the clock).
- **Private helpers (functions starting with `_`)** — full stop. If you feel the need to `patch("core.search._match")`, the design is asking you to extract a real seam (a deep module) or to write the test at a higher layer.

## The "calls" anti-pattern

```python
# ❌ verifies a call, not a behavior
embed.assert_awaited_once_with("rfc")
```

This tests that *the method got called*, not that *the system did the thing*. It locks the test to the current factoring of the code: the moment you batch, cache, retry, or replace the collaborator, the test fails even though behavior is unchanged.

Replace with assertions on the **outcome**:

- For an HTTP endpoint: *"the response was 200 and `response.json()['results']` contains the expected entry."*
- For a service: *"the function returned the expected value"* or *"the database row now has `indexed_at` set."*
- For an event-publishing path: assert on the recorded event in a fake event bus, not on the call signature.

## When you must verify a side effect

Some behaviors *are* side effects on external systems — sending an email, publishing a queue message, calling a webhook. Substitute the external system with a **fake that records the side effect**, then assert on the recorded effect:

```python
class RecordingEmailSender:
    def __init__(self) -> None:
        self.sent: list[Email] = []

    async def send(self, email: Email) -> None:
        self.sent.append(email)
```

Wire it into FastAPI via `app.dependency_overrides[get_email_sender] = lambda: recording_sender` for the test, then assert on `recording_sender.sent`. The *contract* you assert on is the side effect (we sent this email), not the implementation (we called `send` with these arguments).

## FastAPI dependency_overrides

FastAPI gives you a first-class seam: `app.dependency_overrides[<dependency>] = <override>`. Use it for substituting *external* dependencies in tests:

```python
@pytest.fixture
def client():
    app.dependency_overrides[get_claude_client] = lambda: FakeClaudeClient()
    yield TestClient(app)
    app.dependency_overrides.clear()
```

Don't override `get_session` to a mock — override the connection string to point at the test DB instead.

## A short test you can apply

Before you reach for `unittest.mock` / `pytest-mock`, ask:

> If I delete this mock and replace it with the real thing, does my test become (a) slow/flaky/expensive, or (b) just longer to set up?

- (a) means the dependency is external — go ahead and substitute.
- (b) means the dependency is internal — set it up against the real Postgres and keep the test honest.

## A note on `unittest.mock`, `pytest-mock`, `respx`

All fine libraries — the problem is *what* you mock with them, not the libraries themselves. `patch("core.search.SearchService")` in an integration test is a yellow flag worth investigating during review. `respx.get("https://api.anthropic.com/...")` is exactly the right use.
