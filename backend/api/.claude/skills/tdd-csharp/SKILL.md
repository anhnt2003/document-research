---
name: tdd-csharp
description: Use this skill whenever the user asks to add a feature, fix a bug, or change observable behavior in the `backend/api/` sub-project (DocumentResearch.Api, .NET 10, C#, xUnit, EF Core) — even if they don't say "TDD" or "test first". Trigger on phrases like "add endpoint", "implement controller", "fix bug in DocumentsController", "the API should return Y when Z", "add EF entity", "write tests for the API", or any new business logic touching `backend/api/DocumentResearch.Api/**` or `backend/api/DocumentResearch.Api.Tests/**`. Enforces a vertical-slice red→green→refactor workflow: integration-style tests via `WebApplicationFactory<Program>` through the public HTTP surface (no mocking the DbContext or repositories), one-test-at-a-time discipline, and an explicit planning step with the user before any code is written. Skip only for genuinely trivial work where tests add no value: config tweaks, formatting, NuGet bumps, EF migration scaffolding (the migration itself, not the behavior it enables), read-only exploration, documentation edits, and pure spikes that will be deleted.
---

# Test-Driven Development — .NET / C# (`backend/api/`)

Stack: .NET 10, ASP.NET Core (controllers), EF Core 10 + Npgsql + Pgvector, xUnit 2.9. Solution file is `DocumentResearch.slnx` (XML format). Tests live in `DocumentResearch.Api.Tests`.

`backend/api/` owns the Postgres schema for the whole monorepo (see root `CLAUDE.md`). Any new table/column/index goes through an EF Core migration *here*, not from `backend/core/`.

## Philosophy

**Core principle**: tests verify behavior through public interfaces, not implementation details. Production code should be free to change shape; tests should not.

**Good tests** are integration-style — they exercise real code paths through the public HTTP surface (`WebApplicationFactory<Program>` + `HttpClient`). They describe *what* the API does, not *how*. A good test name reads like a specification: `Post_Document_ReturnsCreated_WhenPayloadValid`, `Get_Document_ReturnsNotFound_WhenIdDoesNotExist`. These tests survive refactors because they don't care about controller internals, repository structure, or DI wiring.

**Bad tests** are coupled to implementation. They mock `AppDbContext`, mock an `IDocumentRepository` the controller owns, verify `Mock<T>.Verify(..., Times.Once())`, or reach into private fields with reflection. The warning sign: the test breaks when you rename or restructure something, but the observable HTTP behavior is unchanged. If renaming a private helper makes tests fail, those tests were testing implementation.

See [references/tests.md](references/tests.md) for concrete xUnit examples and [references/mocking.md](references/mocking.md) for the C#-specific mocking rules (mock the third-party HTTP / Anthropic SDK / clock — not the EF Core context or your own services).

## Anti-pattern: horizontal slices

**DO NOT write all the tests first, then all the implementation.** That is "horizontal slicing" — treating RED as "write every test" and GREEN as "make them all pass."

It produces **crap tests**, for predictable reasons:

- Tests written in bulk test *imagined* behavior, not *actual* behavior. You haven't seen the code yet so you guess at what matters.
- You end up testing the *shape* of things (DTO field names, controller method signatures, that a list isn't null) rather than user-facing API behavior.
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

Use the project's existing vocabulary so test names and class names match what's already in `backend/api/`. Look at existing controllers, EF entities, and `appsettings.json` keys first. Respect the schema-ownership rule (any DDL goes through EF Core migration in this project).

Before writing code:

- [ ] Confirm with the user which interface changes are needed (new endpoint? new controller method? change to a DTO or response shape?)
- [ ] Confirm which behaviors to test, in priority order — you can't test everything; make the priority explicit
- [ ] If a new table/column is needed, plan the EF Core migration as a separate step (it's prerequisite scaffolding, not the behavior under test)
- [ ] Identify chances for [deep modules](references/deep-modules.md) — a small interface hiding non-trivial implementation
- [ ] Design interfaces for [testability](references/interface-design.md) — observable through the HTTP surface, side effects pushed to seams you can substitute (`TimeProvider`, an `IClaudeClient`, etc.)
- [ ] List behaviors to test (not implementation steps). *"Returns 404 when document missing"* is a behavior; *"calls `_repo.GetAsync` once"* is not.
- [ ] Get the user's approval on the plan before writing any code

Ask the user explicitly: *"What should the HTTP contract look like? Which behaviors matter most?"*

### 2. Tracer bullet

Write ONE test that confirms ONE thing end-to-end:

```
RED:   Write an xUnit test for the first behavior → `dotnet test` → it fails for the right reason
GREEN: Write the minimum controller/service/EF code that makes the test pass → `dotnet test` → green
```

For an HTTP endpoint, the tracer bullet is a `WebApplicationFactory<Program>` test posting/getting the request and asserting on the response. Add the `Microsoft.AspNetCore.Mvc.Testing` package to `DocumentResearch.Api.Tests` if it isn't already referenced — propose adding it before writing the first integration test.

### 3. Incremental loop

For each remaining behavior:

```
RED:   Write the next test → `dotnet test` → it fails
GREEN: Add only enough code to pass → `dotnet test` → it passes
```

Rules:

- One test at a time. Don't write three tests then start implementing.
- Only enough code to pass the current test. No speculative "I'll need this later" fields, options, or DTOs.
- Don't anticipate future tests in either the test or the implementation.
- Keep tests focused on observable HTTP behavior, not on which internal collaborators get called.

When you discover a behavior you hadn't planned for (a validation rule, a 400 vs 422 distinction, a tenancy concern), surface it to the user before adding it. The plan changes intentionally, not silently.

### 4. Refactor (only while GREEN)

After all tests for this slice pass, look for [refactor candidates](references/refactoring.md):

- [ ] Extract duplication that has emerged across 2–3 spots (rule of three; don't extract on first sight)
- [ ] Deepen modules: push complexity behind small interfaces (a "DocumentsService" that owns ingestion, not a thin pass-through to the repository)
- [ ] Apply SOLID where it falls out naturally — don't force it
- [ ] Notice what the new code reveals about the *existing* code (often the highest-leverage refactor)
- [ ] Re-run `dotnet test` after each refactor step

**Never refactor while RED.** Get back to GREEN first. Two changes at once obscure which one broke things.

## Per-cycle checklist

```
[ ] Test name describes a behavior, not a method or class
[ ] Test goes through the HTTP surface via WebApplicationFactory<Program>
[ ] Test would still pass if every private/internal helper inside the SUT were renamed
[ ] Code added is the minimum for this test to pass
[ ] No speculative DTOs, fields, options, or config added
[ ] `dotnet test` is fully green before moving on
```

## Tooling reminders

- Run tests: `cd backend/api && dotnet test`. Filter to one test: `dotnet test --filter "FullyQualifiedName~Post_Document_ReturnsCreated"`.
- See test stdout: add `--logger "console;verbosity=detailed"`.
- xUnit attributes: `[Fact]` for parameterless, `[Theory]` + `[InlineData]` for parameterised cases.
- Postgres in tests: prefer Testcontainers (`Testcontainers.PostgreSql` with `pgvector/pgvector:pg17`) over EF Core's `InMemory` provider — `InMemory` doesn't behave like Postgres for transactions, constraints, or pgvector, and produces confident false greens. If you must use `InMemory` (e.g. no Docker available locally), say so explicitly in the planning step.
- For `WebApplicationFactory<Program>` to find the entry point, add `public partial class Program;` to the bottom of `Program.cs`.

## Verify before reporting done

`cd backend/api && dotnet build && dotnet test` — this is the verify command from the root `CLAUDE.md`. A skill that produces green tests but a red build is not done.

## When to step out of this skill

This skill is workflow guidance, not a straitjacket. Step out and tell the user when:

- The task is genuinely trivial — a rename, a formatting fix, a one-line `appsettings.json` change. Just make the change and run `dotnet test`.
- You're spiking to learn an EF Core or ASP.NET behavior — explore freely, then *delete the spike* and re-do the work under TDD.
- The user says "no tests, just the code" — comply, but call out once that future regressions will be harder to catch.
- The change is purely structural (extract method, move file, rename namespace) with no behavior change and existing tests cover it — make the change while GREEN and lean on `dotnet test` as your safety net.
