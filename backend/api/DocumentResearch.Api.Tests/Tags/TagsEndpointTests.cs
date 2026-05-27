using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Tests.Auth;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Tags;

public class TagsEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public TagsEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_Tags_Returns401_WhenNoBearer()
    {
        var response = await _client.GetAsync("/api/v1/tags");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Get_Tags_ReturnsTagsWithLabelColorParentIdAndDocumentCount()
    {
        var token = await SignInAsAdminAsync();

        var parentId = Guid.NewGuid();
        var childId = Guid.NewGuid();
        var docId = Guid.NewGuid();
        await SeedAsync(db =>
        {
            db.Tags.Add(new Tag { Id = parentId, Label = "Research", Color = "oxblood", CreatedAt = DateTimeOffset.UtcNow });
            db.Tags.Add(new Tag { Id = childId, Label = "ML Papers", Color = "amber", ParentId = parentId, CreatedAt = DateTimeOffset.UtcNow });
            db.Documents.Add(new Document { Id = docId, Title = "Doc", Body = "...", CreatedAt = DateTimeOffset.UtcNow });
            db.DocumentTags.Add(new DocumentTag { DocumentId = docId, TagId = childId, AttachedAt = DateTimeOffset.UtcNow });
        });

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/tags");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var items = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .EnumerateArray().ToList();

        var parent = items.Single(x => x.GetProperty("id").GetGuid() == parentId);
        Assert.Equal("Research", parent.GetProperty("label").GetString());
        Assert.Equal("oxblood", parent.GetProperty("color").GetString());
        Assert.Equal(JsonValueKind.Null, parent.GetProperty("parent_id").ValueKind);
        Assert.Equal(0, parent.GetProperty("document_count").GetInt32());

        var child = items.Single(x => x.GetProperty("id").GetGuid() == childId);
        Assert.Equal("ML Papers", child.GetProperty("label").GetString());
        Assert.Equal("amber", child.GetProperty("color").GetString());
        Assert.Equal(parentId, child.GetProperty("parent_id").GetGuid());
        Assert.Equal(1, child.GetProperty("document_count").GetInt32());
    }

    private async Task<string> SignInAsAdminAsync()
    {
        var email = $"admin-{Guid.NewGuid():N}@example.com";
        await SeedAdminAsync(email);

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Tag Admin",
            Picture: null);

        var signIn = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "good" });
        signIn.EnsureSuccessStatusCode();
        return (await signIn.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("token").GetString()!;
    }

    [Fact]
    public async Task Post_Tag_Returns201_WithCreatedTagBodyAndLocationHeader()
    {
        var token = await SignInAsAdminAsync();

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/tags")
        {
            Content = JsonContent.Create(new { label = "Methodology", color = "moss" }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        var newId = payload.GetProperty("id").GetGuid();
        Assert.NotEqual(Guid.Empty, newId);
        Assert.Equal("Methodology", payload.GetProperty("label").GetString());
        Assert.Equal("moss", payload.GetProperty("color").GetString());
        Assert.Equal(JsonValueKind.Null, payload.GetProperty("parent_id").ValueKind);
        Assert.Equal(0, payload.GetProperty("document_count").GetInt32());

        // Verify persistence via a follow-up GET.
        using var listReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/tags");
        listReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var listResponse = await _client.SendAsync(listReq);
        var items = (await listResponse.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToList();
        Assert.Contains(items, t => t.GetProperty("id").GetGuid() == newId);
    }

    [Fact]
    public async Task Post_Tag_Returns400_WhenColorIsNotAllowed()
    {
        var token = await SignInAsAdminAsync();

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/tags")
        {
            Content = JsonContent.Create(new { label = "Bad", color = "rainbow" }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(400, problem.GetProperty("status").GetInt32());
        var detail = problem.GetProperty("detail").GetString() ?? "";
        Assert.Contains("color", detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Post_Tag_Returns409_WhenLabelDuplicatedUnderSameParent()
    {
        var token = await SignInAsAdminAsync();

        var parentId = Guid.NewGuid();
        var dupLabel = $"Methods-{Guid.NewGuid():N}";
        await SeedAsync(db =>
        {
            db.Tags.Add(new Tag { Id = parentId, Label = $"Root-{Guid.NewGuid():N}", Color = "ink", CreatedAt = DateTimeOffset.UtcNow });
            db.Tags.Add(new Tag { Id = Guid.NewGuid(), Label = dupLabel, Color = "moss", ParentId = parentId, CreatedAt = DateTimeOffset.UtcNow });
        });

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/tags")
        {
            Content = JsonContent.Create(new { label = dupLabel, color = "rust", parent_id = parentId }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(409, problem.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Put_Tag_Returns400_WhenParentWouldCreateCycle()
    {
        var token = await SignInAsAdminAsync();

        // A is parent of B. Try to set A's parent to B → cycle.
        var aId = Guid.NewGuid();
        var bId = Guid.NewGuid();
        await SeedAsync(db =>
        {
            db.Tags.Add(new Tag { Id = aId, Label = $"A-{Guid.NewGuid():N}", Color = "ink", CreatedAt = DateTimeOffset.UtcNow });
            db.Tags.Add(new Tag { Id = bId, Label = $"B-{Guid.NewGuid():N}", Color = "moss", ParentId = aId, CreatedAt = DateTimeOffset.UtcNow });
        });

        using var request = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/tags/{aId}")
        {
            Content = JsonContent.Create(new { label = "A renamed", color = "ink", parent_id = bId }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("cycle", (problem.GetProperty("detail").GetString() ?? "").ToLowerInvariant());
    }

    [Fact]
    public async Task Delete_Tag_Returns409_WhenTagHasChildren()
    {
        var token = await SignInAsAdminAsync();

        var parentId = Guid.NewGuid();
        var childId = Guid.NewGuid();
        await SeedAsync(db =>
        {
            db.Tags.Add(new Tag { Id = parentId, Label = $"Parent-{Guid.NewGuid():N}", Color = "ink", CreatedAt = DateTimeOffset.UtcNow });
            db.Tags.Add(new Tag { Id = childId, Label = $"Child-{Guid.NewGuid():N}", Color = "moss", ParentId = parentId, CreatedAt = DateTimeOffset.UtcNow });
        });

        using var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/tags/{parentId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("children", (problem.GetProperty("detail").GetString() ?? "").ToLowerInvariant());
    }

    [Fact]
    public async Task Delete_Tag_Returns204AndRemovesFromDocuments_WhenTagAttachedToDocument()
    {
        var token = await SignInAsAdminAsync();

        var tagId = Guid.NewGuid();
        var docId = Guid.NewGuid();
        await SeedAsync(db =>
        {
            db.Tags.Add(new Tag { Id = tagId, Label = $"Throwaway-{Guid.NewGuid():N}", Color = "rust", CreatedAt = DateTimeOffset.UtcNow });
            db.Documents.Add(new Document { Id = docId, Title = "Doc with tag", Body = "...", CreatedAt = DateTimeOffset.UtcNow });
            db.DocumentTags.Add(new DocumentTag { DocumentId = docId, TagId = tagId, AttachedAt = DateTimeOffset.UtcNow });
        });

        using var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/tags/{tagId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Null(await db.Tags.FindAsync(tagId));
        Assert.Empty(db.DocumentTags.Where(dt => dt.TagId == tagId));
    }

    [Fact]
    public async Task Post_Tag_Returns403_WhenUserLacksTagsWritePermission()
    {
        var token = await SignInAsReaderAsync();

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/tags")
        {
            Content = JsonContent.Create(new { label = $"NoPerm-{Guid.NewGuid():N}", color = "ink" }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<string> SignInAsReaderAsync()
    {
        var email = $"reader-{Guid.NewGuid():N}@example.com";
        await SeedAsync(db =>
        {
            if (db.Roles.Find("role-reader") is null)
            {
                db.Roles.Add(new Role
                {
                    Id = "role-reader",
                    Name = "Reader",
                    IsSystem = false,
                    PermissionKeys = new List<string> { "documents:read", "tags:read" },
                });
            }
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                DisplayName = "Reader",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UserRoles = new List<UserRole> { new() { RoleId = "role-reader" } },
            });
        });

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Reader",
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

    private async Task SeedAdminAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
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
            DisplayName = "Tag Admin",
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UserRoles = new List<UserRole> { new() { RoleId = "role-admin" } },
        });
        await db.SaveChangesAsync();
    }
}
