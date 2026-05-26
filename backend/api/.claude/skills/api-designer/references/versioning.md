# API versioning — `Asp.Versioning`

## When to version

A version bump is for **breaking changes only**:

| Change | Breaking? | Action |
|---|---|---|
| Add a new endpoint | No | Same version |
| Add a new optional field to a response | No | Same version |
| Add a new optional query param | No | Same version |
| Remove a field from a response | **Yes** | New version + deprecate old |
| Rename a field | **Yes** | New version (or dual-emit + deprecate) |
| Change a field's type / format | **Yes** | New version |
| Change a status code for the same input | **Yes** | New version |
| Tighten validation | **Yes** (existing clients suddenly 422) | New version |
| Make a previously-optional field required | **Yes** | New version |
| Change the meaning of a value (e.g., default sort) | **Yes** | New version |

**Default move: do not break.** Add new alongside old. Deprecate old. Remove old in `v(N+1)` only after a documented sunset.

## Versioning strategy: URL path

This service uses **URL path versioning**: `/v1/...`, `/v2/...`. Reasons:

- Trivially routable, trivially curl-able, trivially CDN-cacheable.
- The version is visible in logs and traces without parsing headers.
- Plays well with controller-per-version folder layout (`Controllers/V1/`, `Controllers/V2/`).

We deliberately don't use:

- **Media-type versioning** (`Accept: application/vnd.api.v2+json`) — invisible in URLs, hard to test from a browser.
- **Header versioning** (`X-API-Version: 2`) — same problems plus the header gets dropped by proxies.
- **Query-string versioning** (`?api-version=2`) — confusable with a real query parameter.

Pick one strategy and stick with it across the whole service.

## Wiring `Asp.Versioning`

```bash
dotnet add DocumentResearch.Api package Asp.Versioning.Mvc
dotnet add DocumentResearch.Api package Asp.Versioning.Mvc.ApiExplorer
```

`Program.cs`:

```csharp
builder.Services
    .AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = false;   // make callers be explicit
        options.ReportApiVersions = true;                       // adds api-supported-versions header
        options.ApiVersionReader = new UrlSegmentApiVersionReader();
    })
    .AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'V";                      // → "v1", "v2"
        options.SubstituteApiVersionInUrl = true;
    });
```

Controller:

```csharp
[ApiController]
[ApiVersion(1.0)]
[Route("v{version:apiVersion}/documents")]
public sealed class DocumentsController : ControllerBase { /* ... */ }
```

`{version:apiVersion}` is a route constraint registered by `AddApiVersioning`. The URL becomes `/v1/documents`, `/v2/documents`, etc.

## Deprecation

Mark deprecated versions on the controller and via response headers:

```csharp
[ApiVersion(1.0, Deprecated = true)]
[ApiVersion(2.0)]
[Route("v{version:apiVersion}/documents")]
public sealed class DocumentsController : ControllerBase { }
```

With `ReportApiVersions = true`, deprecated versions show up in:

```
api-supported-versions: 1.0, 2.0
api-deprecated-versions: 1.0
```

Document the sunset date in the `[Obsolete]` attribute on individual actions if they're going away within a still-supported version:

```csharp
[Obsolete("Use POST /v1/documents/{id}/reindex. Sunset 2026-12-31.")]
[HttpPost("/v1/legacy-reindex")]
public Task<IActionResult> LegacyReindex() { /* ... */ }
```

## Multiple versions of the same DTO

Don't try to make one DTO serve two versions. Make `Contracts/V1/DocumentDto.cs` and `Contracts/V2/DocumentDto.cs` — duplicate the small parts that didn't change. The tax of duplication is much lower than the tax of conditional serialisation logic.

If a field's *semantics* changed, **rename the field** in the new version. Old clients on v1 still see the old field with old semantics; new clients on v2 see the new field with new semantics. No silent reinterpretation.

## OpenAPI per version

```csharp
builder.Services.AddOpenApi("v1");
builder.Services.AddOpenApi("v2");

app.MapOpenApi();   // → /openapi/v1.json, /openapi/v2.json
```

Each version's spec contains only that version's endpoints. Frontend code-gen runs once per version.

## Coordinating with downstream consumers

Before shipping a `v2` that deprecates `v1`:

1. Open an issue / Linear ticket per consumer (`frontend/web`, `backend/core`, any external) listing the breaking changes.
2. Decide a sunset window — minimum 30 days for internal consumers, 90 for external.
3. Add the sunset date to the `[Obsolete]` message **and** the response header (`Sunset: <RFC 1123 date>`):
   ```csharp
   [HttpGet]
   public IActionResult Get()
   {
       Response.Headers["Sunset"] = "Wed, 31 Dec 2026 23:59:59 GMT";
       Response.Headers["Deprecation"] = "true";
       return Ok(/* ... */);
   }
   ```
4. After the sunset date, remove the v1 controllers in one PR. Don't leave them around "just in case" — they accumulate.

## When **not** to version

If the API is pre-1.0 / unreleased, just change it. Versioning exists to protect known consumers. Don't pay the cost before there's a benefit. But once `frontend/web` or `backend/core` consumes an endpoint in production, that endpoint is frozen — change → new version.
