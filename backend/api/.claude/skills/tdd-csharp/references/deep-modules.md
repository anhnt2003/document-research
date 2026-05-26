# Deep modules — C#

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

A controller endpoint `POST /api/documents` that handles ingestion, validation, persistence, and indexing — but exposes only `{title, body}` in and `{id, title, indexed_at}` out — is deep. A `DocumentRequestValidator` class with one public method that does only what `[Required]` + `[StringLength]` attributes already do is shallow.

## Symptoms of shallow modules in C#

- Every public method is a one-liner that delegates to a single collaborator (`public Task<Document?> GetAsync(Guid id) => _repo.GetAsync(id);`).
- The interface vocabulary (parameter names, DTO field shapes) mirrors the EF entity exactly — change the column, change the DTO.
- Tests for the module mostly look like "verify it forwarded the call" with `Mock.Verify`.
- Callers always need *both* the module and the thing it wraps, suggesting the wrapper isn't adding value.
- Repositories that are 1:1 wrappers over `DbSet<T>` methods (`AddAsync`, `FindAsync`, `Remove`) with no domain-level operations.

## Cures during the refactor step

Once the slice is GREEN, look for shallow modules and either:

1. **Inline** them — if there's exactly one caller and the module isn't hiding meaningful complexity, fold it into the caller. A controller that goes directly through `AppDbContext` for a simple read is often clearer than going through a thin repository.
2. **Deepen** them — pull in adjacent responsibilities they were leaking. For example, a `DocumentRepository` that only does `AddAsync(Document)` and forces every caller to also build a `Document` from a DTO can be deepened by accepting the DTO directly and owning the mapping.
3. **Collapse** layers — three layers of `Controller → Service → Repository` where each layer adds only a method dispatch can become two layers, or one.

## How this shapes test design

When the system has deep modules, tests written against the *outer* interface (the HTTP endpoint, or a controller method) naturally exercise a lot of real code, which is exactly what good integration-style tests want. You don't need to mock anything, because the interesting behavior lives inside the module.

When the system has many shallow modules, tests at any one layer feel either trivial (everything's just forwarding) or impossible without mocks (the behavior is spread across layers). That's a design smell, not a testing problem — fix the design.

## A concrete example

**Shallow (smell):**

```csharp
public class DocumentsService
{
    private readonly DocumentsRepository _repo;
    public DocumentsService(DocumentsRepository repo) { _repo = repo; }
    public Task<Document?> GetAsync(Guid id)     => _repo.GetAsync(id);
    public Task<Document>  AddAsync(Document d)  => _repo.AddAsync(d);
}
```

Every method is a one-line forward. The service doesn't pay for its interface — the controller could just take the repository directly. Tests of `DocumentsService` either mock the repo (testing nothing) or are duplicates of repository tests.

**Deep (after refactor):**

```csharp
public class DocumentsService
{
    // ingestion = validate, normalise, persist, schedule indexing — all behind one method
    public async Task<Document> IngestAsync(NewDocument input, CancellationToken ct) { /* ... */ }
}
```

One method, but it carries real behavior: validation, persistence, indexing. Tests of `IngestAsync` exercise that behavior end-to-end and survive whatever internal restructuring you do next.

## Where to apply this in `backend/api/`

- Controllers should be thin (HTTP concerns only: routing, status codes, model binding). The deep modules live one level down — services that own a coherent slice of behavior (ingestion, search).
- Repositories should be deeper than a 1:1 wrapper over `DbContext`. If yours is, fold it into the service.
- DTOs vs entities: keep them separate when their shapes genuinely diverge (e.g. a `DocumentResponse` that hides internal columns). Don't duplicate them just because patterns say to.
