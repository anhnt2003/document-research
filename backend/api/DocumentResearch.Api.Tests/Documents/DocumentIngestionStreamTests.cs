using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Tests.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Documents;

public class DocumentIngestionStreamTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public DocumentIngestionStreamTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Stream_ReturnsNotFound_WhenDocumentMissing()
    {
        var missingId = Guid.NewGuid();
        var response = await _client.GetAsync($"/api/v1/documents/{missingId}/ingestion/stream");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Stream_EmitsReadyEvent_AndCloses_WhenStatusBecomesReady()
    {
        var documentId = Guid.NewGuid();
        await SeedDocumentAsync(documentId, IngestionStatus.Pending);

        var streamTask = ReadEventsAsync(documentId, timeoutSeconds: 5);

        // Give the SSE handler a moment to send the initial "Pending" event and start polling.
        await Task.Delay(100);
        await UpdateStatusAsync(documentId, IngestionStatus.Ready);

        var events = await streamTask;

        Assert.Contains(events, e => e.Contains("\"status\":\"Ready\""));
    }

    [Fact]
    public async Task Stream_EmitsFailedEvent_AndCloses_WhenStatusBecomesFailed()
    {
        var documentId = Guid.NewGuid();
        await SeedDocumentAsync(documentId, IngestionStatus.Pending);

        var streamTask = ReadEventsAsync(documentId, timeoutSeconds: 5);

        await Task.Delay(100);
        await UpdateStatusAsync(documentId, IngestionStatus.Failed, error: "Boom");

        var events = await streamTask;

        Assert.Contains(events, e =>
            e.Contains("\"status\":\"Failed\"") && e.Contains("\"error\":\"Boom\""));
    }

    private async Task<List<string>> ReadEventsAsync(Guid documentId, int timeoutSeconds)
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));
        using var request = new HttpRequestMessage(
            HttpMethod.Get, $"/api/v1/documents/{documentId}/ingestion/stream");
        using var response = await _client.SendAsync(
            request, HttpCompletionOption.ResponseHeadersRead, cts.Token);
        response.EnsureSuccessStatusCode();

        var events = new List<string>();
        using var reader = new StreamReader(
            await response.Content.ReadAsStreamAsync(cts.Token), Encoding.UTF8);
        while (await reader.ReadLineAsync(cts.Token) is { } line)
        {
            if (line.StartsWith("data:", StringComparison.Ordinal))
            {
                events.Add(line[5..].Trim());
            }
        }
        return events;
    }

    private async Task SeedDocumentAsync(Guid id, IngestionStatus status, string? error = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Documents.Add(new Document
        {
            Id = id,
            Title = "stream-test",
            Body = "",
            CreatedAt = DateTimeOffset.UtcNow,
            FileName = "test.txt",
            MimeType = "text/plain",
            SizeBytes = 1,
            StorageKey = $"documents/{Guid.NewGuid():N}.txt",
            FileHash = Guid.NewGuid().ToString("N"),
            IngestionStatus = status,
            IngestionError = error,
        });
        await db.SaveChangesAsync();
    }

    private async Task UpdateStatusAsync(Guid id, IngestionStatus status, string? error = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var doc = await db.Documents.FirstAsync(d => d.Id == id);
        doc.IngestionStatus = status;
        doc.IngestionError = error;
        await db.SaveChangesAsync();
    }
}
