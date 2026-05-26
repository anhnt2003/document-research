# OpenAPI on .NET 10 — `Microsoft.AspNetCore.OpenApi`

.NET 10 ships native OpenAPI generation. **Do not install Swashbuckle or NSwag** unless the project already has it — they're redundant with the built-in generator and the team has standardised on the native one (see `DocumentResearch.Api.csproj`: `Microsoft.AspNetCore.OpenApi 10.0.7`).

## What's already wired

`Program.cs` already has:

```csharp
builder.Services.AddOpenApi();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();              // → GET /openapi/v1.json in dev only
}
```

Open `http://localhost:<port>/openapi/v1.json` while the dev server runs to see the generated spec.

## How the generator collects metadata

The generator reads:

1. **Action signature** — return type via `ActionResult<T>`, parameters via `[FromBody]`, `[FromQuery]`, `[FromRoute]`, route templates.
2. **`[ProducesResponseType]`** — every non-200 response. **Required** for accurate spec; without it, the spec only knows about the 200 success type.
3. **XML doc comments** — `<summary>`, `<remarks>`, `<param>`. Enable XML output in the `.csproj` (see below).
4. **`[Tags]`** — OpenAPI tag grouping. Use one tag per resource.

## Turn on XML doc generation

Edit `DocumentResearch.Api.csproj`:

```xml
<PropertyGroup>
  <TargetFramework>net10.0</TargetFramework>
  <Nullable>enable</Nullable>
  <ImplicitUsings>enable</ImplicitUsings>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
  <NoWarn>$(NoWarn);CS1591</NoWarn>   <!-- suppress "missing XML comment" warnings on internals -->
</PropertyGroup>
```

Then write XML docs on every controller action:

```csharp
/// <summary>Get a single document.</summary>
/// <param name="id">Document id (UUID).</param>
/// <response code="200">Document found.</response>
/// <response code="404">No document with the given id.</response>
[HttpGet("{id:guid}")]
[ProducesResponseType<DocumentDto>(StatusCodes.Status200OK)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
public async Task<ActionResult<DocumentDto>> Get(Guid id, CancellationToken ct)
```

## `[ProducesResponseType]` — generic form

Prefer the generic, type-parameterised attribute (.NET 9+):

```csharp
[ProducesResponseType<DocumentDto>(StatusCodes.Status200OK)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
```

Why not the old `typeof` form? The generic form is checked at compile time — rename the DTO and the attribute breaks compilation rather than silently lying in the spec.

## Schema customisation via transformers

For repo-wide schema tweaks (camelCase enum values, formatting `Guid` as `uuid`, hiding internal-only types), register a transformer in `Program.cs`:

```csharp
builder.Services.AddOpenApi(options =>
{
    options.AddSchemaTransformer((schema, ctx, ct) =>
    {
        if (ctx.JsonTypeInfo.Type == typeof(Guid))
        {
            schema.Format = "uuid";
        }
        return Task.CompletedTask;
    });
});
```

Use sparingly — every transformer is a place where the spec diverges from the C# types.

## Multiple versions

Once `Asp.Versioning` is added (see `references/versioning.md`), call `AddOpenApi` per version:

```csharp
builder.Services.AddOpenApi("v1");
builder.Services.AddOpenApi("v2");

app.MapOpenApi();   // serves /openapi/v1.json AND /openapi/v2.json
```

## camelCase JSON

The generator follows whatever `JsonSerializerOptions` the app uses. Configure once in `Program.cs`:

```csharp
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
```

Both blocks are required because Minimal APIs and controllers each have their own options bag. The OpenAPI spec will reflect `camelCase` automatically.

## Serving a Swagger / Redoc UI (optional)

The native package gives you the JSON spec but no UI. If the user wants a UI:

- **Scalar** (recommended, modern, single line):
  ```bash
  dotnet add DocumentResearch.Api package Scalar.AspNetCore
  ```
  ```csharp
  if (app.Environment.IsDevelopment())
  {
      app.MapOpenApi();
      app.MapScalarApiReference();    // → /scalar/v1
  }
  ```
- **Swagger UI**: needs Swashbuckle for the UI only — usually not worth dragging in the dependency.

Default: **don't add a UI** unless the user asks. The JSON spec at `/openapi/v1.json` is enough for code-gen, Postman import, and Redoc-on-demand.

## Client code generation (downstream)

The frontend (`frontend/web/`) and Python `backend/core/` consume this API. Recommend `openapi-typescript` / `openapi-fetch` for Angular, and `openapi-python-client` for Python. Both read the static `openapi/v1.json` — so a build step that snapshots the spec to disk (`dotnet run --project DocumentResearch.Api -- --dump-openapi`) is a worthwhile follow-up once the contract stabilises.

## Validating the spec

Before declaring a design done:

```bash
# install once
npm i -g @redocly/cli

# from anywhere
curl -s http://localhost:5000/openapi/v1.json > /tmp/openapi.json
npx @redocly/cli lint /tmp/openapi.json
```

Treat lint errors as build failures during design review.
