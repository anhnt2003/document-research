using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Tests.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Documents;

public class DocumentUploadEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public DocumentUploadEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_Document_ReturnsCreated_WhenValidFile_AndPersistsToDbAndStorage()
    {
        var token = await SignInAsAdminAsync();
        var bytes = "%PDF-1.4 fake content"u8.ToArray();
        var expectedHash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
        form.Add(fileContent, "file", "research.pdf");
        form.Add(new StringContent("My Research"), "title");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/documents") { Content = form };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        var documentId = payload.GetProperty("id").GetGuid();
        Assert.Equal("My Research", payload.GetProperty("title").GetString());
        Assert.Equal("research.pdf", payload.GetProperty("file_name").GetString());
        Assert.Equal("application/pdf", payload.GetProperty("mime_type").GetString());
        Assert.Equal(bytes.Length, payload.GetProperty("size_bytes").GetInt64());
        Assert.Equal("Pending", payload.GetProperty("ingestion_status").GetString());

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await db.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.Id == documentId);
        Assert.NotNull(saved);
        Assert.Equal(expectedHash, saved!.FileHash);
        Assert.Equal(IngestionStatus.Pending, saved.IngestionStatus);
        Assert.NotNull(saved.StorageKey);

        Assert.True(_factory.FileStorage.Snapshot.ContainsKey(saved.StorageKey!));
        Assert.Equal(bytes, _factory.FileStorage.Snapshot[saved.StorageKey!]);
    }

    [Fact]
    public async Task Post_Document_ReturnsOkWithExistingDocument_WhenSameContentUploadedTwice()
    {
        var token = await SignInAsAdminAsync();
        var bytes = "%PDF-1.4 duplicate me"u8.ToArray();

        var first = await UploadAsync(token, bytes, "application/pdf", "dup.pdf");
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var firstId = (await first.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();
        var storageKeysAfterFirst = _factory.FileStorage.Snapshot.Count;

        var second = await UploadAsync(token, bytes, "application/pdf", "dup-again.pdf");

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var secondId = (await second.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();
        Assert.Equal(firstId, secondId);
        Assert.Equal(storageKeysAfterFirst, _factory.FileStorage.Snapshot.Count);
    }

    [Fact]
    public async Task Post_Document_ReturnsBadRequest_WhenFileFieldMissing()
    {
        var token = await SignInAsAdminAsync();

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Only title"), "title");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/documents") { Content = form };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(ErrorTypes.FileMissing, payload.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Post_Document_ReturnsPayloadTooLarge_WhenFileExceedsMaxBytes()
    {
        var token = await SignInAsAdminAsync();
        var bytes = new byte[2048];
        Array.Fill(bytes, (byte)'A');

        var response = await UploadAsync(token, bytes, "application/pdf", "big.pdf");

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(ErrorTypes.FileTooLarge, payload.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Post_Document_ReturnsUnsupportedMediaType_WhenMimeNotAllowed()
    {
        var token = await SignInAsAdminAsync();
        var bytes = "<svg></svg>"u8.ToArray();

        var response = await UploadAsync(token, bytes, "image/svg+xml", "icon.svg");

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(ErrorTypes.UnsupportedMime, payload.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Post_Document_TriggersIngestion_OnSuccess()
    {
        var token = await SignInAsAdminAsync();
        var bytes = "%PDF-1.4 trigger me"u8.ToArray();

        var response = await UploadAsync(token, bytes, "application/pdf", "trigger.pdf");
        response.EnsureSuccessStatusCode();
        var documentId = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        Assert.Contains(documentId, _factory.IngestionTrigger.Calls);
    }

    [Fact]
    public async Task Post_Document_DoesNotTriggerIngestion_OnDedupe()
    {
        var token = await SignInAsAdminAsync();
        var bytes = "%PDF-1.4 dedupe trigger"u8.ToArray();

        var first = await UploadAsync(token, bytes, "application/pdf", "first.pdf");
        first.EnsureSuccessStatusCode();
        var triggerCountAfterFirst = _factory.IngestionTrigger.Calls.Count;

        var second = await UploadAsync(token, bytes, "application/pdf", "second.pdf");
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        Assert.Equal(triggerCountAfterFirst, _factory.IngestionTrigger.Calls.Count);
    }

    [Fact]
    public async Task Post_Document_WritesActivityLog_OnSuccess()
    {
        var token = await SignInAsAdminAsync();
        var bytes = "%PDF-1.4 activity log"u8.ToArray();

        var response = await UploadAsync(token, bytes, "application/pdf", "logged.pdf");
        response.EnsureSuccessStatusCode();
        var documentId = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logged = await db.ActivityEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Action == "document.upload" && e.Target == documentId.ToString());
        Assert.NotNull(logged);
    }

    [Fact]
    public async Task Post_Document_ReturnsUnauthorized_WhenNoBearer()
    {
        var bytes = "%PDF-1.4"u8.ToArray();
        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
        form.Add(fileContent, "file", "x.pdf");

        var response = await _client.PostAsync("/api/v1/documents", form);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Post_Document_ReturnsForbidden_WhenUserLacksDocumentsWrite()
    {
        var token = await SignInAsViewerAsync();
        var bytes = "%PDF-1.4"u8.ToArray();

        var response = await UploadAsync(token, bytes, "application/pdf", "x.pdf");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<HttpResponseMessage> UploadAsync(string token, byte[] bytes, string mime, string fileName)
    {
        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(mime);
        form.Add(fileContent, "file", fileName);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/documents") { Content = form };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await _client.SendAsync(request);
    }

    private async Task<string> SignInAsViewerAsync()
    {
        var email = $"viewer-{Guid.NewGuid():N}@example.com";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (await db.Roles.FindAsync("role-viewer") is null)
            {
                db.Roles.Add(new Role
                {
                    Id = "role-viewer",
                    Name = "Viewer",
                    IsSystem = true,
                    PermissionKeys = new List<string> { "documents:read" },
                });
            }
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                DisplayName = "Read Only",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UserRoles = new List<UserRole> { new() { RoleId = "role-viewer" } },
            });
            await db.SaveChangesAsync();
        }

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Read Only",
            Picture: null);

        var signIn = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "good" });
        signIn.EnsureSuccessStatusCode();
        return (await signIn.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("token").GetString()!;
    }

    private async Task<string> SignInAsAdminAsync()
    {
        var email = $"admin-{Guid.NewGuid():N}@example.com";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (await db.Roles.FindAsync("role-admin") is null)
            {
                db.Roles.Add(new Role
                {
                    Id = "role-admin",
                    Name = "Administrator",
                    IsSystem = true,
                    PermissionKeys = new List<string> { "*" },
                });
            }
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                DisplayName = "Upload Admin",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UserRoles = new List<UserRole> { new() { RoleId = "role-admin" } },
            });
            await db.SaveChangesAsync();
        }

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Upload Admin",
            Picture: null);

        var signIn = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "good" });
        signIn.EnsureSuccessStatusCode();
        return (await signIn.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("token").GetString()!;
    }
}
