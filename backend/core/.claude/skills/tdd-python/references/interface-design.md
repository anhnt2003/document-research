# Interface design for testability — Python

A testable interface is one a test can call and observe. The work of designing for testability is mostly about pushing side effects to substitutable seams and keeping the surface free of incidental detail.

## Properties of a testable interface

1. **Observable through the public surface.** Whatever the test cares about can be read back through a public return value, a queryable database state, an HTTP follow-up call, or a recorded side effect — not by inspecting a private attribute (`obj._cache`).
2. **Side effects are pushed to seams you can swap.** Time, randomness, third-party HTTP, the LLM call, the email sender — each lives behind a FastAPI dependency or an explicit constructor parameter, not constructed inline.
3. **No hidden inputs.** The function's behavior depends only on its parameters and the injected dependencies. No `datetime.utcnow()` deep in business logic, no `os.environ[...]` outside `core/config.py`, no `uuid.uuid4()` baked into a service method.
4. **The interface vocabulary is the domain's vocabulary.** `ingest(NewDocument)` reads like the system's intent. `process(dict[str, Any])` reads like an internal data structure escaped.

## Common shape problems and the fix

### Problem: time leak

```python
def create(input: NewDocument) -> Document:
    return Document(..., created_at=datetime.utcnow())
```

A test of `create` either has to accept any "recent" timestamp (sloppy) or monkeypatch `datetime` (fragile and global).

**Fix:** inject the clock as a callable. Production wires in `datetime.utcnow`; tests pass a lambda returning a fixed `datetime`.

```python
def create(input: NewDocument, *, now: Callable[[], datetime] = datetime.utcnow) -> Document:
    return Document(..., created_at=now())
```

For FastAPI, expose it via `Depends`.

### Problem: hidden randomness

```python
def make_id() -> str:
    return uuid.uuid4().hex
```

Tests that involve the id either assert on the *shape* (length, regex) or monkeypatch `uuid`. Both are bad.

**Fix:** inject the id generator as a callable. Production wires in `uuid.uuid4`; tests pass a deterministic counter or a fixed-value lambda.

### Problem: bag-of-args constructors

```python
class SearchService:
    def __init__(self, http, cache, embedder, ranker, logger, cfg, store, urls):
        ...
```

Eight parameters means the test setup is eight lines before you start. Each new dependency means rewriting every test that constructs the service.

**Fix:** group related collaborators into a dataclass (e.g. `SearchDeps`), or — more often — recognise that the service is doing too much and split it. Five-plus dependencies is a code smell, not a parameter problem.

### Problem: module-level state

```python
# core/search.py
_cache: dict[str, list[Result]] = {}
```

Two tests run, the first leaves state in `_cache`, the second sees it. You get an intermittent failure that only shows up in CI when test order changes.

**Fix:** put state behind a class (or a FastAPI dependency) and instantiate it per-request. Module-level mutable state in service code is almost always a mistake.

### Problem: in-band signalling

```python
def search(query: str) -> list[Document] | str:
    if not query:
        return "empty query"   # error as a string
    ...
```

Now every caller and every test has to distinguish "list of documents" from "error string." Tests get tangled in `isinstance` checks.

**Fix:** raise a specific exception (which becomes an HTTP 400/422 in FastAPI via an exception handler), or return a discriminated union (`Result | Error`). Make success and failure obviously different to both the caller and mypy.

## Designing the interface before the test

The planning step in the workflow (`SKILL.md` → §1 Planning) is the right place to settle these decisions. A short interface spec — input Pydantic model, output Pydantic model, status codes, what's injected via `Depends` — makes the first test almost write itself, because there's only one way to call the route and only one shape to assert against.

Write the interface down. Then write the first test against it. If the test feels awkward, that's the interface telling you something. Adjust the interface before adding production code.

## Don't over-design

This document is not an excuse to invent ports-and-adapters layering or hexagonal-architecture diagrams for a CRUD endpoint. The minimum design is the one that makes the *current* slice testable. Add seams (FastAPI dependencies, abstract base classes, Protocol types) as you find behaviors that need them; don't pre-create them for behaviors you might want one day.
