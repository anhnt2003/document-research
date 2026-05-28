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

    public async Task<DocumentDto?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var document = await _db.Documents.FindAsync([id], ct);
        if (document is null)
        {
            return null;
        }

        return ToDto(document);
    }

    public async Task<IngestionStatusSnapshot?> GetIngestionStatusAsync(Guid id, CancellationToken ct)
    {
        var snapshot = await _db.Documents
            .AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => new { d.IngestionStatus, d.IngestionError })
            .FirstOrDefaultAsync(ct);
        return snapshot is null
            ? null
            : new IngestionStatusSnapshot(snapshot.IngestionStatus.ToString(), snapshot.IngestionError);
    }

    public async Task<CreateDocumentOutcome> CreateAsync(CreateDocumentRequest request, CancellationToken ct)
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
            return new CreateDocumentOutcome.Deduplicated(ToDto(existing));
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
        };
        _db.Documents.Add(document);
        await _db.SaveChangesAsync(ct);

        _ = _ingestionTrigger.TriggerAsync(document.Id, CancellationToken.None);

        return new CreateDocumentOutcome.Success(ToDto(document));
    }

    internal static DocumentDto ToDto(Document d) =>
        new(d.Id, d.Title, d.Body, d.CreatedAt, d.FileName, d.MimeType, d.SizeBytes, d.IngestionStatus.ToString());
}
