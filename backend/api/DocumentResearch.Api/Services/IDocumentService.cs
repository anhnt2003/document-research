using DocumentResearch.Api.Contracts.Documents;

namespace DocumentResearch.Api.Services;

public interface IDocumentService
{
    Task<DocumentDto?> GetByIdAsync(Guid id, CancellationToken ct);

    Task<CreateDocumentOutcome> CreateAsync(CreateDocumentRequest request, CancellationToken ct);

    Task<IngestionStatusSnapshot?> GetIngestionStatusAsync(Guid id, CancellationToken ct);
}

public sealed record IngestionStatusSnapshot(string Status, string? Error);
