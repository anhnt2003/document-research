using Microsoft.Extensions.Options;

namespace DocumentResearch.Api.Services;

public sealed class HttpDocumentIngestionTrigger(
    IHttpClientFactory factory,
    ILogger<HttpDocumentIngestionTrigger> logger,
    IOptions<CoreOptions> options) : IDocumentIngestionTrigger
{
    public const string HttpClientName = "core";
    public const string ServiceTokenHeader = "X-Service-Token";

    public async Task TriggerAsync(Guid documentId, CancellationToken ct)
    {
        try
        {
            var client = factory.CreateClient(HttpClientName);
            using var request = new HttpRequestMessage(HttpMethod.Post, $"/ingest/{documentId}");
            request.Headers.Add(ServiceTokenHeader, options.Value.ServiceToken);

            using var response = await client.SendAsync(request, ct);
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
