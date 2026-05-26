using DocumentResearch.Api.Contracts.Documents;
using DocumentResearch.Api.Data;

namespace DocumentResearch.Api.Services;

public sealed class DocumentService : IDocumentService
{
    private readonly AppDbContext _db;

    public DocumentService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<DocumentDto?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var document = await _db.Documents.FindAsync([id], ct);
        if (document is null)
        {
            return null;
        }

        return new DocumentDto(document.Id, document.Title, document.Body, document.CreatedAt);
    }
}
