---
name: api-designer
description: Use whenever the user designs, adds, or modifies a REST endpoint in `backend/api/` (ASP.NET Core 10 controllers). Trigger on phrases like "design endpoint", "add controller", "new API for X", "expose Y as REST", "OpenAPI", "Swagger", "DTO", "ProblemDetails", "API versioning", "pagination", "rate limit", "deprecate endpoint", or any task that introduces a new route, request/response shape, or status-code policy. Enforces ASP.NET Core controller idioms (no Minimal APIs), `Microsoft.AspNetCore.OpenApi` (.NET 10 native, not Swashbuckle), RFC 7807 `ProblemDetails`, cursor-based pagination, `Asp.Versioning`, DTO-vs-entity separation, and async EF Core. Skip only for pure entity/EF migration work with no HTTP surface change.
license: MIT (adapted from github.com/Jeffallan/claude-skills/api-designer)
metadata:
  author: anh.nt15@kiotviet.com (adapted)
  version: "0.1.0"
  domain: api-architecture
  stack: dotnet-10, aspnetcore, efcore, postgres, pgvector
  triggers: API design, REST endpoint, controller, OpenAPI, DTO, ProblemDetails, ASP.NET Core, pagination, versioning, rate limit
  role: architect
  scope: design + scaffolding
  output-format: controller + DTO + OpenAPI annotations + tests stub
---

# API Designer — ASP.NET Core 10

Senior API architect for `backend/api/` (the .NET 10 service that owns the Postgres schema in this monorepo). Designs **controller-based** REST endpoints — never Minimal APIs — with .NET 10 native OpenAPI, `ProblemDetails`, and the EF Core + pgvector data layer already in place.

## Why this skill exists

In a polyglot monorepo, API drift is the most expensive kind of drift. The C# service is the schema owner and the source of truth for HTTP contracts that `backend/core/` (Python) and `frontend/web/` (Angular) consume. A wrong status code, an inconsistent error shape, or an un-versioned breaking change forces two other codebases to change — that's the cost we're trying to avoid by getting the design right at the controller boundary.

## Core workflow

Walk the user through these steps in order. Don't skip "Analyze domain" — it's where most bad APIs are born.

1. **Analyze domain** — Identify the resource(s), the consumer(s) (Angular UI, Python `core`, external), and the existing entity (`DocumentResearch.Api/Entities/...`). If no entity exists yet, this is a schema change → coordinate with the EF migration step in [backend/api/CLAUDE.md](../../CLAUDE.md).
2. **Model resources** — Sketch resources & relationships in plain text before any code. URIs are nouns: `/documents/{id}/chunks`, never `/getDocumentChunks`.
3. **Design endpoints** — HTTP method × URI × DTO-in × DTO-out × status codes × auth. Put it in a table so the user can sign off in one screen.
4. **Implement** — Create the DTO records, the controller, and update `DbContext` if needed. Keep DTOs in `DocumentResearch.Api/Contracts/` (separate from `Entities/`). See `references/rest-patterns.md`.
5. **Annotate for OpenAPI** — Use `Microsoft.AspNetCore.OpenApi` attributes (`[ProducesResponseType]`, `[Tags]`, XML doc comments). See `references/openapi.md`.
6. **Errors** — Throw or return RFC 7807 `ProblemDetails` consistently. See `references/error-handling.md`.
7. **Verify** — `dotnet build && dotnet test`, then run the dev server and hit `/openapi/v1.json` to confirm the spec reflects the design. Add an xUnit integration test for at least the happy path and one 4xx.

## Reference guide

Load the matching file when the topic comes up — don't preload all of them.

| Topic | Reference | Load when |
|---|---|---|
| Controllers, DTOs, routing | `references/rest-patterns.md` | New controller, route shape, DTO design |
| .NET 10 native OpenAPI | `references/openapi.md` | OpenAPI annotations, Swagger UI, code-gen for clients |
| `ProblemDetails` (RFC 7807) | `references/error-handling.md` | Error responses, validation errors, exception filters |
| Pagination on EF + pgvector | `references/pagination.md` | Any `GET` returning a collection |
| API versioning | `references/versioning.md` | Breaking change, second consumer arrives, deprecation |

## Constraints

### MUST DO

- **Controllers, not Minimal APIs.** Project convention (`backend/api/CLAUDE.md`). Inherit from `ControllerBase`, attribute-routed with `[ApiController]`.
- **DTOs separate from entities.** Never accept or return an EF entity directly — it leaks schema and breaks the moment the DB changes. Use `record` types in `Contracts/`.
- **`async` all the way.** Controller actions return `Task<ActionResult<TDto>>`; EF calls use `ToListAsync`, `FirstOrDefaultAsync`, etc.
- **`ProblemDetails` for every non-2xx.** Use `Results.Problem(...)` or `ControllerBase.Problem(...)` — never return a raw string or anonymous error object. `Content-Type: application/problem+json`.
- **`[ProducesResponseType]` on every action**, for every status code that action can produce. The native OpenAPI generator reads these.
- **Paginate every collection.** Default `limit=20`, hard cap `limit=100`. Cursor-based for anything backed by Postgres ordering; offset only for small finite admin lists.
- **Version from day one.** Group routes under `/v1/...` even if `v2` doesn't exist yet — adding versioning later is a breaking change in disguise.
- **Document auth.** Even if it's "none for now", say so in the OpenAPI security schemes and add a TODO with a ticket reference.
- **Consistent casing.** `camelCase` for JSON properties (configured via `JsonSerializerOptions`). Don't mix `snake_case` in some responses and `camelCase` in others.

### MUST NOT DO

- **No verbs in URIs.** `POST /documents/{id}/reindex` is OK (still a resource action via sub-resource); `POST /reindexDocument` is not.
- **No anonymous-typed responses.** `return Ok(new { foo = 1 })` makes the OpenAPI spec useless. Use a named DTO record.
- **No `try/catch` around the whole action returning `500`.** Let the global exception handler produce `ProblemDetails`. Catch only when you have a specific, recoverable case.
- **No `IEnumerable<T>` returned from EF without materialization.** Always `ToListAsync()` before leaving the action — otherwise the connection stays open through serialization.
- **No `string` IDs when the entity has a typed key.** Use `Guid`/`long`/`int` directly in the route template (`{id:guid}`) so model binding validates for you.
- **No breaking changes inside a version.** Field removed, type changed, status code changed for the same input → that's `v2`, even if you "think no one uses it." Mark old `[Obsolete("Use /v2/... — sunset 2026-XX-XX")]`.
- **No exposing pgvector embeddings in responses by default.** They're 1k+ floats per row. Opt-in via `?include=embedding`, never default.
- **No swallowing `DbUpdateException`.** Surface it as `409 Conflict` (unique violation) or `400 Bad Request` (FK violation) via the exception handler, with the constraint name in `detail`.

## DTO + controller starter (copy-paste)

```csharp
// Contracts/Documents/DocumentDto.cs
namespace DocumentResearch.Api.Contracts.Documents;

public sealed record DocumentDto(
    Guid Id,
    string Title,
    string SourceUrl,
    DateTimeOffset CreatedAt);

public sealed record CreateDocumentRequest(
    string Title,
    string SourceUrl);

public sealed record DocumentListResponse(
    IReadOnlyList<DocumentDto> Data,
    CursorPage Pagination);

public sealed record CursorPage(
    string? NextCursor,
    bool HasMore);
```

```csharp
// Controllers/V1/DocumentsController.cs
using Microsoft.AspNetCore.Mvc;
using DocumentResearch.Api.Contracts.Documents;

namespace DocumentResearch.Api.Controllers.V1;

[ApiController]
[Route("v1/documents")]
[Tags("Documents")]
public sealed class DocumentsController(AppDbContext db) : ControllerBase
{
    /// <summary>List documents (cursor-paginated).</summary>
    [HttpGet]
    [ProducesResponseType<DocumentListResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DocumentListResponse>> List(
        [FromQuery] string? cursor,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        if (limit is < 1 or > 100)
            return Problem(
                type: "https://api.docresearch.local/errors/invalid-limit",
                title: "Invalid limit",
                statusCode: 400,
                detail: "limit must be between 1 and 100.");

        // ... cursor decode + EF query (see references/pagination.md)
        throw new NotImplementedException();
    }

    /// <summary>Get a single document.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType<DocumentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DocumentDto>> Get(Guid id, CancellationToken ct)
    {
        var doc = await db.Documents.FindAsync([id], ct);
        if (doc is null)
            return Problem(
                type: "https://api.docresearch.local/errors/document-not-found",
                title: "Document not found",
                statusCode: 404,
                detail: $"No document with id={id}.");

        return Ok(new DocumentDto(doc.Id, doc.Title, doc.SourceUrl, doc.CreatedAt));
    }

    /// <summary>Create a document.</summary>
    [HttpPost]
    [ProducesResponseType<DocumentDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DocumentDto>> Create(
        CreateDocumentRequest body,
        CancellationToken ct)
    {
        // validation → EF insert → return CreatedAtAction
        throw new NotImplementedException();
    }
}
```

## Output checklist

When delivering an API design, hand the user:

1. **Resource model** — one short table: resource → entity → consumer(s).
2. **Endpoint table** — method, URI, request DTO, response DTO, status codes, auth, version.
3. **DTO records** under `Contracts/<Area>/`.
4. **Controller skeleton** with `[ProducesResponseType]` on every action.
5. **`ProblemDetails` `type` URIs** for every distinct error case, registered somewhere the user can search (we recommend a static `ErrorTypes` class).
6. **OpenAPI verified**: dev server runs, `/openapi/v1.json` reflects the design.
7. **At least one xUnit test** per endpoint (happy path + the most likely 4xx).
8. **Versioning note** — what's `/v1`, what would break the contract.

## Knowledge reference

ASP.NET Core 10, `Microsoft.AspNetCore.OpenApi`, OpenAPI 3.1, RFC 7807 `ProblemDetails`, `Asp.Versioning`, EF Core 10, `Npgsql.EntityFrameworkCore.PostgreSQL`, `Pgvector.EntityFrameworkCore`, cursor pagination, OAuth 2.0 / JWT bearer (when added), rate limiting middleware (`Microsoft.AspNetCore.RateLimiting`), xUnit integration tests with `WebApplicationFactory`.

Adapted from [Jeffallan/claude-skills/api-designer](https://github.com/Jeffallan/claude-skills/blob/main/skills/api-designer/SKILL.md) (MIT).
