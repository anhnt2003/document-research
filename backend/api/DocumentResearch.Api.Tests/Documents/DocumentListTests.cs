using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Tests.Auth;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Documents;

public class DocumentListTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public DocumentListTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task List_ReturnsOnlyDocumentsOwnedByCaller()
    {
        var caller = await _factory.RegisterAndSignInAsync(_client, "documents:read");
        var otherId = Guid.NewGuid();

        var ownDoc = await SeedDocumentAsync(caller.UserId);
        var hiddenDoc = await SeedDocumentAsync(otherId);

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/documents");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", caller.Token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var ids = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .EnumerateArray()
            .Select(d => d.GetProperty("id").GetGuid())
            .ToHashSet();

        Assert.Contains(ownDoc, ids);
        Assert.DoesNotContain(hiddenDoc, ids);
    }

    private async Task<Guid> SeedDocumentAsync(Guid ownerId)
    {
        var id = Guid.NewGuid();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Documents.Add(new Document
        {
            Id = id,
            Title = "listed",
            Body = "",
            CreatedAt = DateTimeOffset.UtcNow,
            OwnerId = ownerId,
        });
        await db.SaveChangesAsync();
        return id;
    }
}
