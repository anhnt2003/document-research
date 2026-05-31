using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Tests.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Tags;

public class DocumentTagsEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public DocumentTagsEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_DocumentTags_IsIdempotent_DoesNotDuplicateOnSecondCall()
    {
        var token = await SignInAsAdminAsync();

        var docId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        await SeedAsync(db =>
        {
            db.Documents.Add(new Document { Id = docId, Title = "Doc", Body = "...", CreatedAt = DateTimeOffset.UtcNow });
            db.Tags.Add(new Tag { Id = tagId, Label = $"Attach-{Guid.NewGuid():N}", Color = "moss", CreatedAt = DateTimeOffset.UtcNow });
        });

        async Task<HttpResponseMessage> Attach()
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/documents/{docId}/tags")
            {
                Content = JsonContent.Create(new { tag_ids = new[] { tagId } }),
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return await _client.SendAsync(req);
        }

        var first = await Attach();
        var second = await Attach();

        Assert.True(first.IsSuccessStatusCode, $"first attach failed: {first.StatusCode}");
        Assert.True(second.IsSuccessStatusCode, $"second attach failed: {second.StatusCode}");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var count = await db.DocumentTags
            .Where(dt => dt.DocumentId == docId && dt.TagId == tagId)
            .CountAsync();
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task Get_DocumentTags_ReturnsOnlyAttachedTags_WithDocumentCount()
    {
        var token = await SignInAsAdminAsync();

        var docId = Guid.NewGuid();
        var attachedTagId = Guid.NewGuid();
        var unrelatedTagId = Guid.NewGuid();
        await SeedAsync(db =>
        {
            db.Documents.Add(new Document { Id = docId, Title = "Doc", Body = "...", CreatedAt = DateTimeOffset.UtcNow });
            db.Tags.Add(new Tag { Id = attachedTagId, Label = $"Attached-{Guid.NewGuid():N}", Color = "amber", CreatedAt = DateTimeOffset.UtcNow });
            db.Tags.Add(new Tag { Id = unrelatedTagId, Label = $"Unrelated-{Guid.NewGuid():N}", Color = "ink", CreatedAt = DateTimeOffset.UtcNow });
            db.DocumentTags.Add(new DocumentTag { DocumentId = docId, TagId = attachedTagId, AttachedAt = DateTimeOffset.UtcNow });
        });

        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/documents/{docId}/tags");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal(attachedTagId, items[0].GetProperty("id").GetGuid());
        Assert.DoesNotContain(items, t => t.GetProperty("id").GetGuid() == unrelatedTagId);
    }

    [Fact]
    public async Task Delete_DocumentTag_Returns204_AndRemovesAttachment()
    {
        var token = await SignInAsAdminAsync();

        var docId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        await SeedAsync(db =>
        {
            db.Documents.Add(new Document { Id = docId, Title = "Doc", Body = "...", CreatedAt = DateTimeOffset.UtcNow });
            db.Tags.Add(new Tag { Id = tagId, Label = $"Detachable-{Guid.NewGuid():N}", Color = "moss", CreatedAt = DateTimeOffset.UtcNow });
            db.DocumentTags.Add(new DocumentTag { DocumentId = docId, TagId = tagId, AttachedAt = DateTimeOffset.UtcNow });
        });

        using var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/documents/{docId}/tags/{tagId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Empty(db.DocumentTags.Where(dt => dt.DocumentId == docId && dt.TagId == tagId));
        Assert.NotNull(await db.Tags.FindAsync(tagId)); // tag itself still exists
    }

    private async Task<string> SignInAsAdminAsync()
    {
        var email = $"doctags-admin-{Guid.NewGuid():N}@example.com";
        await SeedAsync(db =>
        {
            if (db.Roles.Find("admin") is null)
            {
                db.Roles.Add(new Role
                {
                    Id = "admin",
                    Name = "Administrator",
                    IsSystem = true,
                    PermissionKeys = new List<string> { "*" },
                });
            }
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                DisplayName = "Doc Tag Admin",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UserRoles = new List<UserRole> { new() { RoleId = "admin" } },
            });
        });

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Doc Tag Admin",
            Picture: null);

        var signIn = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "good" });
        signIn.EnsureSuccessStatusCode();
        return (await signIn.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("token").GetString()!;
    }

    private async Task SeedAsync(Action<AppDbContext> seed)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        seed(db);
        await db.SaveChangesAsync();
    }
}
