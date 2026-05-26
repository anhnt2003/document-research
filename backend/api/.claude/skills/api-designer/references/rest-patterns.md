# REST patterns — ASP.NET Core 10 controllers

## Folder layout

```
DocumentResearch.Api/
├── Controllers/
│   └── V1/
│       ├── DocumentsController.cs
│       └── SearchController.cs
├── Contracts/               # DTOs — public HTTP shape, owned by API
│   └── Documents/
│       ├── DocumentDto.cs
│       └── CreateDocumentRequest.cs
├── Entities/                # EF Core entities — private to the data layer
│   └── Document.cs
└── Persistence/
    └── AppDbContext.cs
```

`Contracts/` is the public surface. `Entities/` is internal. **Never** return an entity directly from a controller — if `Document.PasswordHash` exists tomorrow, you've just leaked it.

## Resource design — nouns, hierarchies, and the verb-temptation

URIs name **resources**. The HTTP method is the verb.

| Good | Bad | Why |
|---|---|---|
| `GET /v1/documents` | `GET /v1/listDocuments` | method already says "get" |
| `POST /v1/documents` | `POST /v1/createDocument` | method already says "create" |
| `GET /v1/documents/{id}/chunks` | `GET /v1/chunksForDocument?id=...` | hierarchy is a sub-resource |
| `POST /v1/documents/{id}/reindex` | `POST /v1/reindexDocument` | action-on-resource → sub-resource pattern |
| `DELETE /v1/documents/{id}` | `POST /v1/deleteDocument` | method says "delete" |

**Action-on-resource exception:** if the operation isn't naturally a CRUD on the resource itself (e.g., "reindex this document", "send a reset email"), use a sub-resource: `POST /v1/documents/{id}/reindex`. The URI is still noun-based — `reindex` is the *name* of the sub-resource, not a verb on `documents`.

## Route templates and typed binding

Use route constraints so model binding rejects bad input before your code runs:

```csharp
[HttpGet("{id:guid}")]                    // Guid only
[HttpGet("{slug:regex(^[a-z0-9-]+$)}")]   // kebab-case slug
[HttpGet("{page:int:min(1)}")]             // positive int
```

Project-wide, prefer `Guid` primary keys for new resources (already the case for `documents.id`). It plays nicely with cursor encoding, sharding, and exposing IDs to the client without revealing row counts.

## DTOs as records

C# `record` types fit DTOs like a glove: value-equality, immutability, and `with`-expression for transforms.

```csharp
public sealed record DocumentDto(
    Guid Id,
    string Title,
    string SourceUrl,
    DateTimeOffset CreatedAt);
```

**Naming:**

- `XxxDto` — outbound response shape.
- `CreateXxxRequest`, `UpdateXxxRequest` — inbound bodies. `Request` not `Dto` makes intent obvious in controller signatures.
- `XxxListResponse` — paginated wrapper (`Data` + `Pagination`). Don't return a bare `List<T>`; the moment you need a `next_cursor` you've made a breaking change.

## Controller idioms

```csharp
[ApiController]
[Route("v1/[controller]")]      // → /v1/documents
[Tags("Documents")]              // OpenAPI grouping
public sealed class DocumentsController(AppDbContext db, ILogger<DocumentsController> log)
    : ControllerBase
{ }
```

- **Primary constructor.** C# 12+ — keeps controllers terse.
- **`sealed`.** Controllers are leaves; sealing helps the JIT and signals "don't inherit me."
- **No `services` field; inject what you use.** If a controller has 6 dependencies, the controller is doing too much — extract a service.
- **`[ApiController]`** gives you automatic 400 on model-binding failures, returned as `ProblemDetails`.

## Action return types

Prefer `Task<ActionResult<TDto>>` over `Task<IActionResult>`:

```csharp
public async Task<ActionResult<DocumentDto>> Get(Guid id, CancellationToken ct)
```

- The generic gives the OpenAPI generator the success type for free.
- You can still `return NotFound()` / `return Problem(...)` — `ActionResult<T>` implicitly accepts both.
- Always take `CancellationToken ct` and pass it down to `*Async` calls. Long EF queries dropped mid-request waste DB connections.

## Status codes — the short list

| Code | When |
|---|---|
| `200 OK` | Successful GET/PUT/PATCH with a body |
| `201 Created` | Successful POST that created a resource. Set `Location` via `CreatedAtAction(...)` |
| `204 No Content` | Successful DELETE or update with no body |
| `400 Bad Request` | Malformed input, business-rule violation discovered before persistence |
| `401 Unauthorized` | Missing/invalid auth |
| `403 Forbidden` | Authenticated but not allowed |
| `404 Not Found` | Resource doesn't exist (or auth doesn't allow you to know it exists) |
| `409 Conflict` | Unique-constraint violation, optimistic concurrency, state machine violation |
| `422 Unprocessable Entity` | Syntactically valid but semantically wrong (validation errors with `errors[]`) |
| `429 Too Many Requests` | Rate limited. Include `Retry-After` header |
| `500 Internal Server Error` | Unhandled — never returned deliberately, only via the global handler |
| `503 Service Unavailable` | Downstream (Postgres, OpenAI) is down. Include `Retry-After` |

**Rule of thumb:** if you're tempted to return `400` for a missing record, you mean `404`. If you're tempted to return `500` for a known case, you mean `409` or `422`.

## CancellationToken hygiene

ASP.NET Core binds `HttpContext.RequestAborted` to any `CancellationToken` parameter automatically. Use it:

```csharp
public async Task<ActionResult<DocumentDto>> Get(Guid id, CancellationToken ct)
{
    var doc = await db.Documents.FindAsync([id], ct);   // ← ct passed
    // ...
}
```

If the client disconnects, the EF query is cancelled and your server doesn't waste CPU.

## Idempotency

- `GET`, `PUT`, `DELETE` must be idempotent by HTTP spec. Hitting `DELETE` twice → second one returns `204` or `404`, never `500`.
- `POST` is **not** idempotent by default. If the caller needs idempotent POST (payment-like operations), accept an `Idempotency-Key` header and store the response keyed by it for a window (e.g., 24h). Document the header in OpenAPI.

## When to break controller-per-resource

Default to **one controller per top-level resource**. Break it when:

- Sub-resource has its own auth model (`/documents/{id}/permissions` → `DocumentPermissionsController`).
- Sub-resource has 5+ actions of its own — the parent controller gets unwieldy.

Don't break it for "I want shorter files" — that's what `partial class` or just scrolling is for.
