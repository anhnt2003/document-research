using System.Security.Cryptography;
using DocumentResearch.Api.Contracts.Documents;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DocumentResearch.Api.Services;

public sealed class DocumentService : IDocumentService
{
    private readonly AppDbContext _db;
    private readonly IFileStorage _storage;
    private readonly TimeProvider _clock;
    private readonly DocumentUploadOptions _options;
    private readonly IDocumentIngestionTrigger _ingestionTrigger;

    public DocumentService(
        AppDbContext db,
        IFileStorage storage,
        TimeProvider clock,
        IOptions<DocumentUploadOptions> options,
        IDocumentIngestionTrigger ingestionTrigger)
    {
        _db = db;
        _storage = storage;
        _clock = clock;
        _options = options.Value;
        _ingestionTrigger = ingestionTrigger;
    }

    public async Task<IReadOnlyList<DocumentDto>> ListAccessibleAsync(Guid userId, CancellationToken ct)
    {
        var isAdmin = await IsAdminAsync(userId, ct);
        var documents = await AccessibleQuery(userId, isAdmin)
            .AsNoTracking()
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(ct);

        return documents
            .Select(d => ToDto(d, AccessLevel(d, userId, isAdmin)))
            .ToList();
    }

    public async Task<DocumentDto?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var isAdmin = await IsAdminAsync(userId, ct);
        var document = await AccessibleQuery(userId, isAdmin)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id, ct);
        return document is null ? null : ToDto(document, AccessLevel(document, userId, isAdmin));
    }

    public async Task<IngestionStatusSnapshot?> GetIngestionStatusAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var isAdmin = await IsAdminAsync(userId, ct);
        var snapshot = await AccessibleQuery(userId, isAdmin)
            .AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => new { d.IngestionStatus, d.IngestionError })
            .FirstOrDefaultAsync(ct);
        return snapshot is null
            ? null
            : new IngestionStatusSnapshot(snapshot.IngestionStatus.ToString(), snapshot.IngestionError);
    }

    public async Task<bool> CanAccessAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var isAdmin = await IsAdminAsync(userId, ct);
        return await AccessibleQuery(userId, isAdmin).AnyAsync(d => d.Id == id, ct);
    }

    private IQueryable<Document> AccessibleQuery(Guid userId, bool isAdmin)
    {
        var documents = _db.Documents.AsQueryable();
        return isAdmin ? documents : documents.Where(d => d.OwnerId == userId);
    }

    private async Task<bool> IsAdminAsync(Guid userId, CancellationToken ct) =>
        await _db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == "admin", ct);

    public async Task<CreateDocumentOutcome> CreateAsync(CreateDocumentRequest request, Guid ownerId, CancellationToken ct)
    {
        if (request.SizeBytes > _options.MaxBytes)
        {
            return new CreateDocumentOutcome.FileTooLarge(request.SizeBytes, _options.MaxBytes);
        }

        if (!_options.AllowedMimes.Contains(request.MimeType))
        {
            return new CreateDocumentOutcome.UnsupportedMime(request.MimeType, _options.AllowedMimes);
        }

        using var buffer = new MemoryStream();
        await request.Content.CopyToAsync(buffer, ct);
        var bytes = buffer.ToArray();
        var hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

        var existing = await _db.Documents
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.FileHash == hash, ct);
        if (existing is not null)
        {
            return new CreateDocumentOutcome.Deduplicated(ToDto(existing, existing.OwnerId == ownerId ? "owner" : "none"));
        }

        var documentId = Guid.NewGuid();
        var extension = Path.GetExtension(request.FileName);
        var storageKey = $"documents/{hash}{extension}";

        await _storage.PutAsync(storageKey, new MemoryStream(bytes), request.MimeType, ct);

        var document = new Document
        {
            Id = documentId,
            Title = string.IsNullOrWhiteSpace(request.Title) ? request.FileName : request.Title,
            Body = string.Empty,
            CreatedAt = _clock.GetUtcNow(),
            FileName = request.FileName,
            MimeType = request.MimeType,
            SizeBytes = request.SizeBytes,
            StorageKey = storageKey,
            FileHash = hash,
            IngestionStatus = IngestionStatus.Pending,
            OwnerId = ownerId,
        };
        _db.Documents.Add(document);
        await _db.SaveChangesAsync(ct);

        _ = _ingestionTrigger.TriggerAsync(document.Id, CancellationToken.None);

        return new CreateDocumentOutcome.Success(ToDto(document, "owner"));
    }

    internal static DocumentDto ToDto(Document d, string myAccessLevel) =>
        new(d.Id, d.Title, d.Body, d.CreatedAt, d.FileName, d.MimeType, d.SizeBytes,
            d.IngestionStatus.ToString(), d.OwnerId, myAccessLevel);

    private static string AccessLevel(Document d, Guid userId, bool isAdmin) =>
        d.OwnerId == userId || isAdmin ? "owner" : "none";
}
