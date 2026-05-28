namespace DocumentResearch.Api.Services;

public interface IDocumentIngestionTrigger
{
    Task TriggerAsync(Guid documentId, CancellationToken ct);
}
