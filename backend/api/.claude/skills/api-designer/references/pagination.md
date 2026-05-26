# Pagination on EF Core + Postgres (and pgvector)

**Default to cursor-based.** Use offset only for genuinely small, finite admin lists.

## Why cursor over offset

| | Cursor (keyset) | Offset |
|---|---|---|
| Cost at page 1000 | O(limit) | O(offset + limit) — scans `offset` rows you throw away |
| Drift under insert/delete | None — anchored to a real row | Rows shift; pages duplicate/skip |
| Total-count available | No (or expensive separate query) | Yes |
| URL stability | Stable | Page numbers change when data does |
| Client UX | "Load more" / infinite scroll | "Go to page 47" |

For document/chunk/embedding tables that grow, **always** cursor. The `Document` table at 10M rows with `OFFSET 9_999_980 LIMIT 20` will scan ten million rows. The same query as a cursor scans 20.

## Wire shape

Every paginated endpoint returns the same envelope:

```json
{
  "data": [ /* items */ ],
  "pagination": {
    "nextCursor": "eyJ0IjoiMjAyNi0wNS0yNVQxMDoyMDowMFoiLCJpIjoiYTNmMC0uLi4ifQ",
    "hasMore": true
  }
}
```

DTOs:

```csharp
public sealed record DocumentListResponse(
    IReadOnlyList<DocumentDto> Data,
    CursorPage Pagination);

public sealed record CursorPage(
    string? NextCursor,
    bool HasMore);
```

When `hasMore == false`, `nextCursor == null`. The client treats "no more pages" by checking `hasMore`, not by `nextCursor == null` alone (defensive, but consistent).

## Cursor encoding

A cursor is **opaque to the client** and **decodable by the server**. Encode whatever sort key tuple you need, base64url it.

```csharp
// Cursors/DocumentCursor.cs
using System.Text;
using System.Text.Json;

internal sealed record DocumentCursor(DateTimeOffset CreatedAt, Guid Id)
{
    public string Encode()
    {
        var json = JsonSerializer.Serialize(this);
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(json))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');     // base64url
    }

    public static DocumentCursor? TryDecode(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor)) return null;
        try
        {
            var padded = cursor.Replace('-', '+').Replace('_', '/');
            padded += new string('=', (4 - padded.Length % 4) % 4);
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(padded));
            return JsonSerializer.Deserialize<DocumentCursor>(json);
        }
        catch { return null; }
    }
}
```

**Sort key must be unique.** `CreatedAt` alone is not — two rows can share a millisecond. Adding `Id` as a tiebreaker makes the cursor a true keyset.

## The EF query

```csharp
public async Task<ActionResult<DocumentListResponse>> List(
    [FromQuery] string? cursor,
    [FromQuery] int limit = 20,
    CancellationToken ct = default)
{
    if (limit is < 1 or > 100)
        return Problem(ErrorTypes.InvalidLimit, "Invalid limit", 400,
            $"limit must be between 1 and 100; got {limit}.");

    var decoded = DocumentCursor.TryDecode(cursor);
    if (cursor is not null && decoded is null)
        return Problem(ErrorTypes.InvalidCursor, "Invalid cursor", 400,
            "The provided cursor is malformed or expired.");

    var query = db.Documents.AsNoTracking().OrderByDescending(d => d.CreatedAt).ThenBy(d => d.Id);

    if (decoded is not null)
    {
        query = query.Where(d =>
            d.CreatedAt < decoded.CreatedAt ||
            (d.CreatedAt == decoded.CreatedAt && d.Id.CompareTo(decoded.Id) > 0));
    }

    // Fetch limit + 1 to know if there's a next page without a separate query
    var rows = await query.Take(limit + 1).ToListAsync(ct);

    var hasMore = rows.Count > limit;
    var page = rows.Take(limit).ToList();

    string? nextCursor = hasMore
        ? new DocumentCursor(page[^1].CreatedAt, page[^1].Id).Encode()
        : null;

    var data = page.Select(d => new DocumentDto(d.Id, d.Title, d.SourceUrl, d.CreatedAt)).ToList();

    return Ok(new DocumentListResponse(data, new CursorPage(nextCursor, hasMore)));
}
```

Key moves:

- **`AsNoTracking()`** — read-only, big perf win.
- **Composite order (`CreatedAt`, `Id`)** — required for keyset.
- **`Take(limit + 1)`** — one extra row tells you whether there's another page. Cheaper than `Count()`.
- **`AsNoTracking` + project to DTO in memory** — fine for page sizes ≤100. For wider rows, `Select(d => new DocumentDto(...))` in the EF query so Postgres returns only those columns.

## Required Postgres index

For the query above to use an index scan, you need:

```sql
CREATE INDEX ix_documents_createdat_id ON documents (created_at DESC, id ASC);
```

Add it via EF migration:

```csharp
// In your DbContext OnModelCreating:
modelBuilder.Entity<Document>()
    .HasIndex(d => new { d.CreatedAt, d.Id })
    .HasDatabaseName("ix_documents_createdat_id")
    .IsDescending(true, false);
```

Then `dotnet ef migrations add AddDocumentPaginationIndex`. Without this index, cursor pagination is fast at page 1 and slow at page 100.

## Offset pagination — when it's OK

For small admin lists (`< 1000` rows total, hand-curated), offset is fine:

```csharp
[HttpGet]
public async Task<ActionResult<AdminListResponse>> List(
    [FromQuery] int page = 1,
    [FromQuery] int limit = 20,
    CancellationToken ct = default)
{
    if (page < 1 || limit is < 1 or > 100) return Problem(...);

    var total = await db.Admins.CountAsync(ct);
    var data = await db.Admins
        .OrderBy(a => a.Email)
        .Skip((page - 1) * limit)
        .Take(limit)
        .Select(a => new AdminDto(a.Id, a.Email))
        .ToListAsync(ct);

    return Ok(new AdminListResponse(data, new OffsetPage(page, limit, total)));
}
```

Don't mix shapes. Pick cursor or offset per endpoint and document it in OpenAPI.

## Pagination + pgvector similarity search

Vector similarity is **inherently ordered by distance**, not by `created_at`. Cursors don't work the same way — you can't "continue from row X" because the order depends on the query embedding.

Two options:

1. **Top-K only** (recommended for chat/RAG): return top 20, no pagination. Most consumers don't need page 2 of similarity results — relevance falls off a cliff.
2. **Two-phase**: page 1 returns top-K candidate IDs + scores; further "pages" use cursor pagination over the materialised candidate set, not over the vector index. Document this clearly so the client doesn't expect arbitrarily-deep similarity pagination.

```csharp
// Top-K similarity — no pagination
[HttpPost("search")]
public async Task<ActionResult<SearchResponse>> Search(
    SearchRequest body,
    [FromQuery] int topK = 20,
    CancellationToken ct = default)
{
    if (topK is < 1 or > 100) return Problem(...);

    var results = await db.DocumentChunks
        .OrderBy(c => c.Embedding.CosineDistance(body.QueryEmbedding))
        .Take(topK)
        .Select(c => new SearchHit(c.Id, c.DocumentId, c.Text, c.Embedding.CosineDistance(body.QueryEmbedding)))
        .ToListAsync(ct);

    return Ok(new SearchResponse(results));
}
```

`CosineDistance` comes from `Pgvector.EntityFrameworkCore`. The vector index (`ivfflat` or `hnsw`) is created by the EF migration, not the LINQ query.
