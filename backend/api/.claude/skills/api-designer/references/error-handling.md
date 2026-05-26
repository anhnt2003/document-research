# Error handling — RFC 7807 `ProblemDetails`

ASP.NET Core 10 has built-in support for [RFC 7807 Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807). Use it for **every** non-2xx response — no exceptions, no anonymous error objects, no plain strings.

## The wire format

```json
{
  "type":     "https://api.docresearch.local/errors/validation-error",
  "title":    "Validation Error",
  "status":   422,
  "detail":   "The 'email' field must be a valid email address.",
  "instance": "/v1/users/req-abc123",
  "errors": [
    { "field": "email", "message": "Must be a valid email address." }
  ]
}
```

- `type` — a stable URI that identifies the *kind* of problem. Treat it as the public ID of the error. Document it. **Never** make it a generic string.
- `title` — human-readable, **never** changes between occurrences of the same `type`.
- `status` — must match the HTTP status code.
- `detail` — human-readable, occurrence-specific. Actionable.
- `instance` — a URI that identifies this specific occurrence. Useful for log correlation.
- Custom extensions (`errors[]`, `traceId`, etc.) — allowed, encouraged for field-level validation.

Always set `Content-Type: application/problem+json`. ASP.NET Core does this automatically when you use `Problem(...)` or `ValidationProblem(...)`.

## Three ways to produce a `ProblemDetails`

### 1. From a controller — for known, expected errors

```csharp
if (limit > 100)
{
    return Problem(
        type: ErrorTypes.InvalidLimit,
        title: "Invalid limit",
        statusCode: StatusCodes.Status400BadRequest,
        detail: $"limit must be between 1 and 100; got {limit}.");
}
```

### 2. Via the global exception handler — for unexpected errors

`Program.cs`:

```csharp
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Instance =
            $"{ctx.HttpContext.Request.Method} {ctx.HttpContext.Request.Path}";
        ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier;
    };
});

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// ...

app.UseExceptionHandler();     // converts unhandled exceptions → 500 ProblemDetails
app.UseStatusCodePages();      // converts bare 4xx/5xx (e.g. from middleware) → ProblemDetails
```

`GlobalExceptionHandler.cs`:

```csharp
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<GlobalExceptionHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken ct)
    {
        var (status, problemType, title) = exception switch
        {
            DbUpdateException { InnerException: PostgresException { SqlState: "23505" } }
                => (StatusCodes.Status409Conflict, ErrorTypes.UniqueViolation, "Duplicate"),
            DbUpdateException { InnerException: PostgresException { SqlState: "23503" } }
                => (StatusCodes.Status400BadRequest, ErrorTypes.ForeignKeyViolation, "Invalid reference"),
            NotFoundException
                => (StatusCodes.Status404NotFound, ErrorTypes.NotFound, "Not found"),
            DomainException
                => (StatusCodes.Status422UnprocessableEntity, ErrorTypes.DomainError, "Domain rule violated"),
            _ => (StatusCodes.Status500InternalServerError, ErrorTypes.Unexpected, "Unexpected error")
        };

        if (status >= 500) log.LogError(exception, "Unhandled exception");

        httpContext.Response.StatusCode = status;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails =
            {
                Type = problemType,
                Title = title,
                Status = status,
                Detail = exception.Message,
            }
        });
    }
}
```

### 3. From model-binding / validation — automatic

`[ApiController]` already converts model-binding failures into `400 ValidationProblemDetails`. Customise the shape in `Program.cs`:

```csharp
builder.Services.Configure<ApiBehaviorOptions>(o =>
{
    o.InvalidModelStateResponseFactory = ctx =>
    {
        var problem = new ValidationProblemDetails(ctx.ModelState)
        {
            Type = ErrorTypes.ValidationError,
            Title = "Validation failed",
            Status = StatusCodes.Status422UnprocessableEntity,
            Instance = ctx.HttpContext.Request.Path
        };
        return new UnprocessableEntityObjectResult(problem)
        {
            ContentTypes = { "application/problem+json" }
        };
    };
});
```

**Note:** the default behaviour is `400 Bad Request` for model-binding failures. Many teams (and this one, per the constraint table in `rest-patterns.md`) prefer `422 Unprocessable Entity` for *semantic* validation failures and reserve `400` for *syntactic* malformed input. Pick one policy and apply it consistently.

## The `ErrorTypes` registry

Keep all `type` URIs in one static class so the team can grep for them:

```csharp
// Errors/ErrorTypes.cs
public static class ErrorTypes
{
    private const string Base = "https://api.docresearch.local/errors/";

    public const string ValidationError      = Base + "validation-error";
    public const string InvalidLimit         = Base + "invalid-limit";
    public const string NotFound             = Base + "not-found";
    public const string UniqueViolation      = Base + "unique-violation";
    public const string ForeignKeyViolation  = Base + "foreign-key-violation";
    public const string DomainError          = Base + "domain-error";
    public const string Unexpected           = Base + "unexpected";
    // ... add new entries when designing new error cases
}
```

The URI doesn't need to resolve to a real page on day one — but it **should** eventually, hosting per-error docs (what causes it, how to fix it). Until then, `docs/errors/{slug}.md` works.

## Field-level validation errors

For 422s, include an `errors[]` extension so the client can highlight specific fields:

```csharp
var problem = new ValidationProblemDetails
{
    Type = ErrorTypes.ValidationError,
    Title = "Validation failed",
    Status = 422,
};
problem.Errors.Add("email", new[] { "Must be a valid email address." });
problem.Errors.Add("name",  new[] { "Required." });
return UnprocessableEntity(problem);
```

`ValidationProblemDetails.Errors` is a `IDictionary<string, string[]>` — serialises to:

```json
{
  "errors": {
    "email": ["Must be a valid email address."],
    "name":  ["Required."]
  }
}
```

## Don't leak internals

`detail` is human-readable but **public**. Do not put:

- Stack traces (the handler logs them; the client sees a slug).
- SQL statements or constraint internals (`"violates constraint pk_documents_..."` → `"A document with this id already exists."`).
- File paths from the server.

In `Production` (i.e., `!IsDevelopment()`), prefer generic `detail` for 5xx responses and rely on `traceId` for support to look up the real cause server-side.

## Client expectations

Document in the API contract that **every error response is `application/problem+json` with at least `type`, `title`, `status`**. This lets clients write one error handler instead of a switch over status codes:

```typescript
// Angular (frontend/web)
if (!resp.ok) {
  const problem = await resp.json();   // ProblemDetails
  throw new ApiError(problem.type, problem.detail, problem.status);
}
```
