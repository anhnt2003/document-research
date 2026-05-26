using DocumentResearch.Api.Contracts.Documents;

namespace DocumentResearch.Api.Services;

public interface IDocumentService
{
    Task<DocumentDto?> GetByIdAsync(Guid id, CancellationToken ct);
}
