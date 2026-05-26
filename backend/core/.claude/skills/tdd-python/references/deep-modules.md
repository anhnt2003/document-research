# Deep modules — Python

A "deep module" is John Ousterhout's term (*A Philosophy of Software Design*) for a module whose interface is **small** relative to the **complexity** it hides. A shallow module is the opposite: a thin layer that doesn't pay for its interface.

This concept matters for TDD because **the interface is what tests see**. Deep modules are easier to test well; shallow ones force you to either skip the test or write a brittle one.

## The picture

```
Deep module                       Shallow module
+-------------+                   +-------------+
|  interface  |  ← small          |  interface  |  ← large
+-------------+                   +-------------+
|             |                   |  thin body  |
|             |                   +-------------+
|             |
|             |  ← lots of useful
|             |     behavior
|             |
+-------------+
```

A FastAPI route `POST /search` that takes a query string, runs embedding + retrieval + ranking, and returns a results list — but exposes only `{query: str}` in and `{results: [{id, title}]}` out — is deep. A `QueryValidator` class with one public method that does only what Pydantic field constraints already do is shallow.

## Symptoms of shallow modules in Python

- Every public method is a one-liner that delegates to a single collaborator (`async def get(self, id): return await self._repo.get(id)`).
- The interface vocabulary (Pydantic field names) mirrors the SQLAlchemy ORM column names exactly — change the column, change the response model.
- Tests for the module mostly look like "verify it forwarded the call" with `assert_awaited_once_with`.
- Callers always need *both* the module and the thing it wraps.
- A "service" that's a thin async-wrapper around `session.execute(select(...))`.

## Cures during the refactor step

Once the slice is GREEN, look for shallow modules and either:

1. **Inline** them — if there's exactly one caller and the module isn't hiding meaningful complexity, fold it into the caller. A route handler that goes directly through the async session for a simple read is often clearer than going through a thin repository class.
2. **Deepen** them — pull in adjacent responsibilities they were leaking. A `DocumentRepository` that only does `add(Document)` and forces every caller to also build a `Document` ORM object from a Pydantic input can be deepened by accepting the Pydantic model directly and owning the mapping.
3. **Collapse** layers — three layers of `Route → Service → Repository` where each layer adds only a function call can become two layers, or one.

## How this shapes test design

When the system has deep modules, tests written against the *outer* interface (the HTTP endpoint, or a public service function) naturally exercise a lot of real code — exactly what good integration-style tests want. You don't need to mock anything, because the interesting behavior lives inside the module.

When the system has many shallow modules, tests at any one layer feel either trivial (everything's just forwarding) or impossible without mocks (the behavior is spread across layers). That's a design smell, not a testing problem — fix the design.

## A concrete example

**Shallow (smell):**

```python
class DocumentService:
    def __init__(self, repo: DocumentRepository) -> None:
        self._repo = repo

    async def get(self, doc_id: UUID) -> Document | None:
        return await self._repo.get(doc_id)

    async def add(self, doc: Document) -> Document:
        return await self._repo.add(doc)
```

Every method is a one-line forward. The service doesn't pay for its interface — the route could just take the repository directly. Tests of `DocumentService` either mock the repo (testing nothing) or are duplicates of repository tests.

**Deep (after refactor):**

```python
class IngestionService:
    # ingestion = validate, normalise, persist, schedule indexing — all behind one method
    async def ingest(self, input: NewDocument) -> Document:
        ...
```

One method, but it carries real behavior: validation, persistence, indexing. Tests of `ingest` exercise that behavior end-to-end and survive whatever internal restructuring you do next.

## Where to apply this in `backend/core/`

- Route handlers should be thin (HTTP concerns only: parsing the Pydantic request, returning the Pydantic response). The deep modules live one level down — services that own a coherent slice of behavior (search, ingestion, retrieval).
- Repositories should be deeper than a 1:1 wrapper over `session.execute`. If yours is, fold it into the service.
- Pydantic response models vs SQLAlchemy ORM rows: keep them separate when their shapes genuinely diverge (e.g. a response that hides internal columns or computes a field). Don't duplicate them just because the pattern says to.
