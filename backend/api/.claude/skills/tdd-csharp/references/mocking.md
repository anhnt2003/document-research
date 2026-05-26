# Mocking — C# / xUnit

The single biggest failure mode in this project's tests is mocking the wrong thing. Apply this rule first; the rest is detail.

## The rule

**Mock at the system boundary, not inside it.**

The "system under test" is the unit whose behavior you care about — usually a controller with its services, repository, and `DbContext` underneath. Anything *outside* that unit is a fair target for substitution when calling it for real would make the test slow, flaky, or expensive. Anything *inside* that unit must run for real, or you're not testing the system, you're testing a sketch of it.

## Mock these (true external systems)

- **Third-party HTTP APIs** — anything talking to a service the team doesn't own. Use a typed-client substitute: register a fake `IDocumentSourceClient` in the `WebApplicationFactory<Program>` `ConfigureWebHost`, or use a `DelegatingHandler` on `HttpClient`. Don't reach for `Moq` for the controller's own services.
- **The Anthropic API** — wrap it behind an interface (e.g. `IClaudeClient`) and substitute the implementation in tests. Don't issue real network calls in unit/integration tests.
- **The wall clock** — inject `TimeProvider` (built into .NET 8+) and call `_time.GetUtcNow()`. The test passes a `FakeTimeProvider` (from `Microsoft.Extensions.TimeProvider.Testing`) and asserts the exact timestamp.
- **Random / non-deterministic sources** — inject an `IRandom` (or just a `Func<Guid>` for ids). Production wires in `Random.Shared` / `Guid.NewGuid`; tests pass a fixed-value lambda or a seeded source.
- **The filesystem when scope is broad** — for narrowly-scoped tests, prefer `Path.GetTempPath()`-based temp dirs; for code that orchestrates many file operations, a small `IFileSystem` abstraction is fine.

## Do not mock these (internal collaborators)

These live *inside* the system under test. Mocking them produces brittle, hollow tests that lie:

- **`AppDbContext` / `DbSet<T>`** — substitute the *database* (Testcontainers + Postgres) rather than mock the EF Core context. EF Core is not designed to be mocked; expression-tree queries diverge wildly from runtime behavior.
- **Repositories the controller/service owns** — `IDocumentRepository`, `IDocumentReader`. These are part of how the system delivers its behavior, not an external system. Run them for real against the test DB.
- **Other services injected into the controller** — if `DocumentsController` depends on `IIngestionService`, the test should let the real `IIngestionService` run. Substitute only at the genuinely-external seams *inside* `IIngestionService` (the Anthropic call, the clock).
- **Private methods** — full stop. If you feel the need to mock a private method, the design is asking you to extract a real seam (a deep module) or to write the test at a higher layer.

## The "calls" anti-pattern

```csharp
// ❌ verifies a call, not a behavior
mockRepo.Verify(r => r.AddAsync(It.IsAny<Document>()), Times.Once);
```

This tests that *the method got called*, not that *the system did the thing*. It locks the test to the current factoring of the code: the moment you batch, cache, retry, or replace the collaborator, the test fails even though behavior is unchanged.

Replace with assertions on the **outcome**:

- For an HTTP endpoint: *"the response was 201 and a follow-up GET returns the same record."*
- For a service: *"the function returned the expected value"* or *"the database now contains the expected row."*
- For an event-publishing path: assert on the recorded event in a fake `IEventPublisher`, not on the call signature.

## When you must verify a side effect

Some behaviors *are* side effects on external systems — sending an email, publishing a queue message, calling a webhook. Substitute the external system with a **fake that records the side effect**, then assert on the recorded effect:

```csharp
public class RecordingEmailSender : IEmailSender
{
    public List<Email> Sent { get; } = new();
    public Task SendAsync(Email email, CancellationToken ct = default)
    {
        Sent.Add(email);
        return Task.CompletedTask;
    }
}
```

Register it in `WebApplicationFactory<Program>` for the test, then assert on `Sent`. The *contract* you assert on is the side effect (we sent this email), not the implementation (we called `SendAsync` with these arguments). When the system later switches from one library to another, the contract holds, and so does the test.

## A short test you can apply

Before you reach for `Mock<T>`, ask:

> If I delete this mock and replace it with the real thing, does my test become (a) slow/flaky/expensive, or (b) just longer to set up?

- (a) means the dependency is external — go ahead and substitute.
- (b) means the dependency is internal — set it up against Testcontainers and keep the test honest.

## A note on `Moq` and `NSubstitute`

Both are fine libraries — the problem is *what* you mock with them, not the libraries themselves. The presence of `using Moq;` in an integration test for a controller is a yellow flag worth investigating during code review.
