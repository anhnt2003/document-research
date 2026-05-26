# Tests — C# (`backend/api/`)

Stack: .NET 10, xUnit 2.9, EF Core 10 + Postgres (pgvector). Tests in `DocumentResearch.Api.Tests`.

## Commands

```bash
cd backend/api
dotnet test                                            # full suite
dotnet test --filter "FullyQualifiedName~PostDocument" # one test or group
dotnet test --logger "console;verbosity=detailed"      # see test output
```

Solution file is `DocumentResearch.slnx` (XML format, not classic `.sln`).

## Test layering

Prefer the highest layer that still gives a fast, deterministic test. Roughly:

1. **HTTP integration test** — `WebApplicationFactory<Program>` + `HttpClient`. Covers routing, model binding, validation, controller, services, EF, and the DB in one shot. This is the default for endpoint behavior. Add the `Microsoft.AspNetCore.Mvc.Testing` package if `DocumentResearch.Api.Tests` doesn't reference it yet.
2. **Service / domain test** — instantiate the service directly with real collaborators (or in-memory variants you genuinely own). Use only when behavior is pure logic with no IO, or when the endpoint test would be too coarse to pin down the case.
3. **Unit test of a single class** — rare. Reserve for pure utility code (parsers, validators, formatters) where the input/output is obviously the contract.

## Naming

Either of these patterns reads well in the test runner:

- `Method_Scenario_ExpectedOutcome` — `Post_Document_ReturnsCreated_WhenPayloadValid`
- `Should_<expected>_When_<scenario>` — `Should_Return_NotFound_When_Document_Does_Not_Exist`

Pick one per file and stick with it. The name must describe behavior, not implementation. `Post_Document_CallsRepositoryOnce` is an anti-pattern.

## Good test (HTTP integration)

```csharp
public class DocumentsEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public DocumentsEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_Document_ReturnsCreated_WhenPayloadValid()
    {
        var payload = new { title = "RFC 7231", body = "..." };

        var response = await _client.PostAsJsonAsync("/api/documents", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<DocumentDto>();
        Assert.NotNull(created);
        Assert.Equal("RFC 7231", created!.Title);
    }

    [Fact]
    public async Task Get_Document_ReturnsNotFound_WhenIdDoesNotExist()
    {
        var response = await _client.GetAsync("/api/documents/00000000-0000-0000-0000-000000000000");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```

Notice what the test does *not* do: it doesn't peek at `DocumentsController` internals, doesn't stub the repository, doesn't assert on log lines, and doesn't reach into the `DbContext`. It treats the API as a black box.

## Bad test (coupled to implementation)

```csharp
// ❌ Don't do this
[Fact]
public async Task Create_CallsRepositoryAddAsyncExactlyOnce()
{
    var repo = new Mock<IDocumentRepository>();
    var ctrl = new DocumentsController(repo.Object);

    await ctrl.Create(new DocumentDto { Title = "x" });

    repo.Verify(r => r.AddAsync(It.IsAny<Document>()), Times.Once);
}
```

Problems:
- Tests that *a method got called*, not that *the system did the thing*. You can satisfy this test without the document actually being persisted.
- Couples to the existence of `IDocumentRepository.AddAsync`. Rename it or change the design (e.g., move to a unit-of-work pattern) and this test fails for no real reason.
- Bypasses model binding, validation, EF, and any middleware — the real failure surfaces are untested.

## Database

For tests that need real Postgres + pgvector behavior, use Testcontainers:

```csharp
public class DocumentsDbFixture : IAsyncLifetime
{
    public PostgreSqlContainer Container { get; } =
        new PostgreSqlBuilder()
            .WithImage("pgvector/pgvector:pg17")
            .Build();

    public Task InitializeAsync() => Container.StartAsync();
    public Task DisposeAsync()    => Container.DisposeAsync().AsTask();
}
```

Then wire `Container.GetConnectionString()` into your `WebApplicationFactory<Program>` via `ConfigureWebHost` + `UseSetting("ConnectionStrings:DefaultConnection", ...)`.

Avoid `Microsoft.EntityFrameworkCore.InMemory`: it doesn't behave like Postgres for transactions, constraints, or anything pgvector-related, and it produces confident false greens. If Testcontainers isn't an option locally (no Docker), say so explicitly during planning rather than silently substituting InMemory.

## Theory / parameterised cases

Use `[Theory]` + `[InlineData]` for the same behavior under different inputs:

```csharp
[Theory]
[InlineData("", HttpStatusCode.BadRequest)]
[InlineData("   ", HttpStatusCode.BadRequest)]
[InlineData("ok", HttpStatusCode.Created)]
public async Task Post_Validates_Title(string title, HttpStatusCode expected)
{
    var response = await _client.PostAsJsonAsync("/api/documents", new { title, body = "x" });
    Assert.Equal(expected, response.StatusCode);
}
```

Each input/output pair must describe one behavior. If the inputs require radically different assertions, write separate `[Fact]`s instead — clarity beats compression.

## Async

Almost every test in this project is `async Task`. Don't use `.Result` or `.Wait()` — they deadlock under `WebApplicationFactory` in some configurations and they hide stack traces. Use `await` directly, and use `ConfigureAwait(false)` only in library code, never in test methods.

## What to read next

- [mocking.md](mocking.md) — when (and when not) to mock in C#.
- [interface-design.md](interface-design.md) — designing controllers/services so they're testable through their public shape.
- [refactoring.md](refactoring.md) — refactor candidates after the slice is green.
