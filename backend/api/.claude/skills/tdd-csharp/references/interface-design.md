# Interface design for testability — C#

A testable interface is one a test can call and observe. The work of designing for testability is mostly about pushing side effects to substitutable seams and keeping the surface free of incidental detail.

## Properties of a testable interface

1. **Observable through the public surface.** Whatever the test cares about can be read back through a public return value, a queryable database state, an HTTP follow-up call, or a recorded side effect — not by inspecting a private field with reflection.
2. **Side effects are pushed to seams you can swap.** Time, randomness, third-party HTTP, the LLM call, the email sender — each lives behind an interface that's injected via DI, not constructed inline.
3. **No hidden inputs.** The method's behavior depends only on its parameters and the injected dependencies. No `DateTime.UtcNow` in the middle of business logic, no `Environment.GetEnvironmentVariable` outside `Program.cs`, no `Guid.NewGuid()` in a controller method.
4. **The interface vocabulary is the domain's vocabulary.** `IngestAsync(NewDocument)` reads like the system's intent. `Process(Dictionary<string, object>)` reads like an internal data structure escaped.

## Common shape problems and the fix

### Problem: time leak

```csharp
public Document Create(NewDocument input) {
    return new Document { /* ... */, CreatedAt = DateTime.UtcNow };
}
```

A test of `Create` either has to accept any "recent" timestamp (sloppy) or freeze the wall clock with static replacements (fragile).

**Fix:** inject `TimeProvider` (built into .NET 8+) and call `_time.GetUtcNow()`. The test passes a `FakeTimeProvider` from `Microsoft.Extensions.TimeProvider.Testing` and asserts the exact timestamp.

### Problem: hidden randomness

```csharp
public class IngestionService {
    public async Task<Document> IngestAsync(NewDocument input) {
        var id = Guid.NewGuid();
        // ...
    }
}
```

Tests that involve the id either assert on the *shape* (`Assert.NotEqual(Guid.Empty, ...)`) or use complex mock-with-strings to nail down a value. Both are bad.

**Fix:** inject the id generator as `Func<Guid>` or an `IIdGenerator`. Production wires in `Guid.NewGuid`; tests pass a fixed-value lambda or a deterministic counter.

### Problem: bag-of-args constructors

```csharp
public class SearchService(
    HttpClient http, IDistributedCache cache, IEmbedder embedder, IRanker ranker,
    ILogger<SearchService> logger, IConfiguration cfg, IDocumentStore store, IUrlHelper urls) { }
```

Eight parameters mean the test setup is eight lines before you start. Each new dependency means rewriting every test that constructs the service.

**Fix:** group related collaborators behind a smaller interface (e.g. a `SearchDeps` value object), or — more often — recognise that the service is doing too much and split it. Five-plus dependencies is a code smell, not a parameter problem.

### Problem: smuggled static state

```csharp
public class DocumentsController : ControllerBase
{
    private static readonly Cache _cache = new();   // ← module-level mutable state
    // ...
}
```

Two tests run, the first leaves state in `_cache`, the second sees it. You get an intermittent failure that only shows up in CI when test order changes.

**Fix:** put state behind a DI-registered `IDocumentCache` interface, register it with the appropriate lifetime (probably `Scoped` so each request gets fresh state). Module-level mutable state in ASP.NET Core code is almost always a mistake.

### Problem: in-band signalling

```csharp
public Task<object> Search(string query) {
    if (string.IsNullOrWhiteSpace(query)) return Task.FromResult<object>("empty query");
    // ...
}
```

Now every caller and every test has to distinguish "list of documents" from "error string." Tests get tangled in `is` checks.

**Fix:** use the platform's idiomatic error channel. Throw a specific exception, return an `IActionResult` from the controller, or return a `Result<TSuccess, TError>` from the service. Make success and failure obviously different to both the caller and the type checker.

## Designing the interface before the test

The planning step in the workflow (`SKILL.md` → §1 Planning) is the right place to settle these decisions. A short interface spec — input DTO shape, output DTO shape, status codes, what gets injected — makes the first test almost write itself, because there's only one way to call the action and only one shape to assert against.

Write the interface down. Then write the first test against it. If the test feels awkward, that's the interface telling you something. Adjust the interface before adding production code.

## Don't over-design

This document is not an excuse to invent ports-and-adapters layering or hexagonal-architecture diagrams for a CRUD endpoint. The minimum design is the one that makes the *current* slice testable. Add seams (DI registrations, interfaces) as you find behaviors that need them; don't pre-create them for behaviors you might want one day.
