using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Tests.Auth;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests;

public class GetDocumentByIdEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;
    private Guid _readerId;

    public GetDocumentByIdEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_Document_ReturnsOk_WhenDocumentExists()
    {
        await AuthenticateAsReaderAsync();
        var documentId = Guid.NewGuid();
        await SeedDocumentAsync(new Document
        {
            Id = documentId,
            Title = "Existing Doc",
            Body = "Body content",
            CreatedAt = DateTimeOffset.UtcNow,
        });

        var response = await _client.GetAsync($"/api/v1/documents/{documentId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Get_Document_ReturnsNotFound_WhenIdDoesNotExist()
    {
        await AuthenticateAsReaderAsync();
        var missingId = Guid.NewGuid();

        var response = await _client.GetAsync($"/api/v1/documents/{missingId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Get_Document_ReturnsDocumentJson_WithIdTitleBodyCreatedAt()
    {
        await AuthenticateAsReaderAsync();
        var documentId = Guid.NewGuid();
        var createdAt = new DateTimeOffset(2026, 5, 1, 12, 30, 0, TimeSpan.Zero);
        await SeedDocumentAsync(new Document
        {
            Id = documentId,
            Title = "A Document",
            Body = "Hello world",
            CreatedAt = createdAt,
        });

        var response = await _client.GetAsync($"/api/v1/documents/{documentId}");
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(documentId, payload.GetProperty("id").GetGuid());
        Assert.Equal("A Document", payload.GetProperty("title").GetString());
        Assert.Equal("Hello world", payload.GetProperty("body").GetString());
        Assert.Equal(createdAt, payload.GetProperty("created_at").GetDateTimeOffset());
    }

    private async Task AuthenticateAsReaderAsync()
    {
        var reader = await _factory.RegisterAndSignInAsync(_client, "documents:read");
        _readerId = reader.UserId;
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", reader.Token);
    }

    private async Task SeedDocumentAsync(Document document)
    {
        // The signed-in reader owns the document so resource-level read access is granted.
        document.OwnerId = _readerId;
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Documents.Add(document);
        await db.SaveChangesAsync();
    }
}
