using DocumentResearch.Api.Contracts.Documents;

namespace DocumentResearch.Api.Services;

public interface IDocumentService
{
    Task<IReadOnlyList<DocumentDto>> ListAccessibleAsync(Guid userId, CancellationToken ct);

    Task<DocumentDto?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct);

    Task<CreateDocumentOutcome> CreateAsync(CreateDocumentRequest request, Guid ownerId, CancellationToken ct);

    Task<IngestionStatusSnapshot?> GetIngestionStatusAsync(Guid id, Guid userId, CancellationToken ct);

    Task<bool> CanAccessAsync(Guid id, Guid userId, CancellationToken ct);
}

public sealed record IngestionStatusSnapshot(string Status, string? Error);
