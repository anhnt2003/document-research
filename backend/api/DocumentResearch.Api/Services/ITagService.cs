using DocumentResearch.Api.Contracts.Documents;

namespace DocumentResearch.Api.Services;

public interface ITagService
{
    Task<IReadOnlyList<TagDto>> ListAsync(CancellationToken ct);

    Task<CreateTagOutcome> CreateAsync(CreateTagRequest request, CancellationToken ct);

    Task<UpdateTagOutcome> UpdateAsync(Guid id, UpdateTagRequest request, CancellationToken ct);

    Task<DeleteTagOutcome> DeleteAsync(Guid id, CancellationToken ct);

    Task<AttachTagsOutcome> AttachAsync(Guid documentId, IReadOnlyList<Guid> tagIds, CancellationToken ct);

    Task<IReadOnlyList<TagDto>?> ListForDocumentAsync(Guid documentId, CancellationToken ct);

    Task<DetachTagOutcome> DetachAsync(Guid documentId, Guid tagId, CancellationToken ct);
}
