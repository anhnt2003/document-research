---
name: tdd-python
description: Use this skill whenever the user asks to add a feature, fix a bug, or change observable behavior in the `backend/core/` sub-project (Python 3.11, FastAPI, SQLAlchemy 2.0 async, pytest, pytest-asyncio, mypy strict) — even if they don't say "TDD" or "test first". Trigger on phrases like "add endpoint to core", "implement search service", "fix bug in core", "the search should return X when Y", "add async function for", "write tests for backend/core", or any new business logic touching `backend/core/src/**` or `backend/core/tests/**`. Enforces a vertical-slice red→green→refactor workflow: integration-style tests via `httpx.AsyncClient` + `ASGITransport` against the real FastAPI app (no mocking the route handler or service the SUT owns), one-test-at-a-time discipline, and an explicit planning step with the user before any code is written. Reminder: `backend/core/` is NOT the Postgres schema owner — never write migrations from here; `backend/api/` owns DDL. Skip only for genuinely trivial work where tests add no value: config tweaks, formatting, dependency bumps via `uv add`, read-only exploration, documentation edits, and pure spikes that will be deleted.
---

# Test-Driven Development — Python / FastAPI (`backend/core/`)

Stack: Python 3.11, FastAPI + Uvicorn, SQLAlchemy 2.0 async + `psycopg[binary]` v3, `pgvector` (Python binding), Anthropic SDK. Tests use pytest 9 + pytest-asyncio with `asyncio_mode = "auto"` and `pythonpath = ["src"]`. Package manager is **uv** — never `pip`/`poetry`/`pipenv` in this project.

`backend/core/` reads and writes data against the Postgres schema, but **does not own DDL**. Any new table or column must come from an EF Core migration in `backend/api/`. If the task needs a schema change, surface that to the user and pause — don't sneak `CREATE TABLE` in here.

## Philosophy

**Core principle**: tests verify behavior through public interfaces, not implementation details. Production code should be free to change shape; tests should not.

**Good tests** are integration-style — they exercise real code paths through the public HTTP surface (`httpx.AsyncClient` + `ASGITransport(app=app)`). They describe *what* the API does, not *how*. A good test name reads like a specification: `test_search_returns_empty_list_when_query_is_blank`, `test_post_document_returns_201_when_payload_valid`. These tests survive refactors because they don't care about which router, dependency, or service was wired up internally.

**Bad tests** are coupled to implementation. They `AsyncMock` the async SQLAlchemy session, mock a `SearchService` that the route handler owns, `patch("core.search._match")`, or assert that a specific function was awaited once. The warning sign: the test breaks when you rename or restructure something, but the observable HTTP behavior is unchanged. If renaming an internal helper makes tests fail, those tests were testing implementation.

See [references/tests.md](references/tests.md) for concrete pytest examples and [references/mocking.md](references/mocking.md) for the Python-specific mocking rules (mock the Anthropic API, the wall clock, randomness — not your own services or the async session).

## Anti-pattern: horizontal slices

**DO NOT write all the tests first, then all the implementation.** That is "horizontal slicing" — treating RED as "write every test" and GREEN as "make them all pass."

It produces **crap tests**, for predictable reasons:

- Tests written in bulk test *imagined* behavior, not *actual* behavior. You haven't seen the code yet so you guess at what matters.
- You end up testing the *shape* of things (Pydantic field names, response keys, that a list isn't `None`) rather than user-facing API behavior.
- The tests become insensitive to real changes — they pass when behavior breaks and fail when behavior is fine.
- You outrun your headlights: you commit to a test structure before you understand the implementation it describes.

**Correct approach**: vertical slices via tracer bullets. One test → one piece of implementation → repeat. Each test responds to what you learned from writing the previous test's code.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED → GREEN: test1 → impl1
  RED → GREEN: test2 → impl2
  ...
```

## Workflow

### 1. Planning (before any code)

Use the project's existing vocabulary so route paths, Pydantic model names, and function names match what's already in `backend/core/src/core/`. Look at existing routers and `core/config.py` first. Respect the schema-ownership rule (no DDL here).

Before writing code:

- [ ] Confirm with the user which interface changes are needed (new route? new service function? change to a Pydantic response model?)
- [ ] Confirm which behaviors to test, in priority order — you can't test everything; make the priority explicit
- [ ] If the task needs a new column or index, stop and tell the user the migration must go through `backend/api/` first
- [ ] Identify chances for [deep modules](references/deep-modules.md) — a small interface hiding non-trivial implementation
- [ ] Design interfaces for [testability](references/interface-design.md) — observable through the HTTP surface, side effects pushed to seams you can substitute (a clock callable, an injected `AsyncAnthropic`, etc.)
- [ ] List behaviors to test (not implementation steps). *"Returns empty list when query is blank"* is a behavior; *"calls embed() once"* is not.
- [ ] Get the user's approval on the plan before writing any code

Ask the user explicitly: *"What should the HTTP contract look like? Which behaviors matter most?"*

### 2. Tracer bullet

Write ONE test that confirms ONE thing end-to-end:

```
RED:   Write a pytest test for the first behavior → `uv run pytest` → it fails for the right reason
GREEN: Write the minimum FastAPI route / service code that makes the test pass → `uv run pytest` → green
```

For an HTTP endpoint, the tracer bullet uses `httpx.AsyncClient` against `ASGITransport(app=app)` — call the API the same way a real client would, assert on status code and body.

### 3. Incremental loop

For each remaining behavior:

```
RED:   Write the next test → `uv run pytest` → it fails
GREEN: Add only enough code to pass → `uv run pytest` → it passes
```

Rules:

- One test at a time. Don't write three tests then start implementing.
- Only enough code to pass the current test. No speculative Pydantic fields, no `Optional[...]` parameters you don't need yet.
- Don't anticipate future tests in either the test or the implementation.
- Keep tests focused on observable HTTP behavior, not on which internal collaborators get called.

When you discover a behavior you hadn't planned for (a validation rule, a 422 vs 400 distinction, a tenancy concern), surface it to the user before adding it. The plan changes intentionally, not silently.

### 4. Refactor (only while GREEN)

After all tests for this slice pass, look for [refactor candidates](references/refactoring.md):

- [ ] Extract duplication that has emerged across 2–3 spots (rule of three; don't extract on first sight)
- [ ] Deepen modules: push complexity behind small interfaces (a `SearchService` that owns embed+retrieve+rank, not three layers of one-liners)
- [ ] Apply natural Python idioms where they fall out — don't force them
- [ ] Notice what the new code reveals about the *existing* code (often the highest-leverage refactor)
- [ ] Re-run `uv run pytest && uv run ruff check . && uv run mypy src` after each refactor step

**Never refactor while RED.** Get back to GREEN first. Two changes at once obscure which one broke things.

## Per-cycle checklist

```
[ ] Test name describes a behavior, not a function or module
[ ] Test goes through the HTTP surface via httpx.AsyncClient + ASGITransport
[ ] Test would still pass if every internal helper inside the SUT were renamed
[ ] Code added is the minimum for this test to pass
[ ] No speculative Pydantic fields, options, kwargs, or config added
[ ] `uv run pytest` is fully green before moving on
```

## Tooling reminders

- Run tests: `cd backend/core && uv run pytest`. One file: `uv run pytest tests/test_search.py`. Name filter: `uv run pytest -k "returns_empty_list"`.
- Stop on first fail + verbose: `uv run pytest -x -vv`.
- `asyncio_mode = "auto"` is already on — async test functions don't need `@pytest.mark.asyncio`; just write `async def test_...`.
- Imports use `from core....` (because `pythonpath = ["src"]` in `pyproject.toml`).
- Database in tests: don't use SQLite for code that touches pgvector — dialects diverge and you'll get false greens. Either reuse the running `docker compose` Postgres with a transaction-per-test pattern, or use Testcontainers + `pgvector/pgvector:pg17`.
- Mypy is strict. Keep test fixtures and helpers fully typed too — the suite is also code.

## Verify before reporting done

`cd backend/core && uv run pytest && uv run ruff check .` — this matches the verify command in the root `CLAUDE.md`. Add `uv run mypy src` if you're touching production typing.

## When to step out of this skill

This skill is workflow guidance, not a straitjacket. Step out and tell the user when:

- The task is genuinely trivial — a rename, a one-line config change in `core/config.py`, a docstring fix. Just make the change and run `uv run pytest`.
- You're spiking to learn an SDK behavior (Anthropic, SQLAlchemy 2.0 async, pgvector) — explore freely, then *delete the spike* and re-do the work under TDD.
- The user says "no tests, just the code" — comply, but call out once that future regressions will be harder to catch.
- The change is purely structural (rename a function, move a module) with no behavior change and existing tests cover it — make the change while GREEN and lean on `pytest` as your safety net.
