using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Tests.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Documents;

public class DocumentOwnerCaptureTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public DocumentOwnerCaptureTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Upload_SetsOwnerToUploader()
    {
        var user = await _factory.RegisterAndSignInAsync(_client, "documents:write");
        var bytes = "%PDF-1.4 owned content"u8.ToArray();

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
        form.Add(fileContent, "file", "owned.pdf");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/documents") { Content = form };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", user.Token);
        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var documentId = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await db.Documents.AsNoTracking().FirstAsync(d => d.Id == documentId);

        Assert.Equal(user.UserId, saved.OwnerId);
    }
}
