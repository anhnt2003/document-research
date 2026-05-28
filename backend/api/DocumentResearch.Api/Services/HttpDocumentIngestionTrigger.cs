namespace DocumentResearch.Api.Services;

public sealed class HttpDocumentIngestionTrigger(
    IHttpClientFactory factory,
    ILogger<HttpDocumentIngestionTrigger> logger) : IDocumentIngestionTrigger
{
    public const string HttpClientName = "core";

    public async Task TriggerAsync(Guid documentId, CancellationToken ct)
    {
        try
        {
            var client = factory.CreateClient(HttpClientName);
            using var response = await client.PostAsync($"/ingest/{documentId}", content: null, ct);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "Ingestion trigger for {DocumentId} returned non-success: {StatusCode}",
                    documentId, response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Ingestion trigger for {DocumentId} failed", documentId);
        }
    }
}
