using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Auth;

public class GoogleSignInEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public GoogleSignInEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_GoogleSignIn_Returns400_WhenIdTokenMissing()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token ="" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.EndsWith("errors/invalid-request", problem.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Post_GoogleSignIn_Returns401_WhenGoogleRejectsToken()
    {
        _factory.Verifier.Handler = _ =>
            throw new GoogleTokenInvalidException("token is malformed");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token ="bad-token" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.EndsWith("errors/google-token-invalid", problem.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Post_GoogleSignIn_Returns401_WhenEmailNotVerified()
    {
        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: "google-sub-123",
            Email: "anh@example.com",
            EmailVerified: false,
            Name: "Anh",
            Picture: null);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token ="x" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.EndsWith("errors/email-not-verified", problem.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Post_GoogleSignIn_Returns403_WhenEmailUnknown()
    {
        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: "google-sub-456",
            Email: "stranger@example.com",
            EmailVerified: true,
            Name: "Stranger",
            Picture: null);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token ="x" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.EndsWith("errors/user-not-provisioned", problem.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Post_GoogleSignIn_Returns423_WhenUserLocked()
    {
        var email = $"locked-{Guid.NewGuid():N}@example.com";
        await SeedUserAsync(new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = "Locked User",
            Status = "locked",
            CreatedAt = DateTimeOffset.UtcNow,
        });

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: "google-sub-locked",
            Email: email,
            EmailVerified: true,
            Name: "Locked User",
            Picture: null);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token ="x" });

        Assert.Equal((HttpStatusCode)423, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.EndsWith("errors/user-locked", problem.GetProperty("type").GetString());
    }

    [Fact]
    public async Task Post_GoogleSignIn_ReturnsToken_WhenEmailIsProvisioned()
    {
        var userId = Guid.NewGuid();
        var email = $"admin-{Guid.NewGuid():N}@example.com";
        await SeedRoleAsync(new Role
        {
            Id = "role-admin",
            Name = "Administrator",
            IsSystem = true,
            PermissionKeys = new List<string> { "*" },
        });
        await SeedUserAsync(new User
        {
            Id = userId,
            Email = email,
            DisplayName = "Admin",
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UserRoles = new List<UserRole>
            {
                new() { RoleId = "role-admin" },
            },
        });

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: "google-sub-admin",
            Email: email,
            EmailVerified: true,
            Name: "Admin From Google",
            Picture: "https://example.com/a.png");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token ="good" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();

        var token = payload.GetProperty("token").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.Equal(3, token!.Split('.').Length);

        var expiresAt = payload.GetProperty("expires_at").GetDateTimeOffset();
        Assert.True(expiresAt > DateTimeOffset.UtcNow.AddDays(6));
        Assert.True(expiresAt <= DateTimeOffset.UtcNow.AddDays(8));

        var user = payload.GetProperty("user");
        Assert.Equal(userId, user.GetProperty("id").GetGuid());
        Assert.Equal(email, user.GetProperty("email").GetString());
        var roleIds = user.GetProperty("role_ids").EnumerateArray()
            .Select(e => e.GetString()).ToList();
        Assert.Contains("role-admin", roleIds);

        var roles = payload.GetProperty("roles").EnumerateArray().ToList();
        Assert.Single(roles);
        Assert.Equal("role-admin", roles[0].GetProperty("id").GetString());
        Assert.Equal("Administrator", roles[0].GetProperty("name").GetString());
        Assert.True(roles[0].GetProperty("is_system").GetBoolean());
    }

    [Fact]
    public async Task Post_GoogleSignIn_BindsGoogleSubOnFirstLogin()
    {
        var userId = Guid.NewGuid();
        var email = $"first-{Guid.NewGuid():N}@example.com";
        await SeedRoleAsync(new Role
        {
            Id = $"role-{Guid.NewGuid():N}",
            Name = "Reader",
            IsSystem = false,
            PermissionKeys = new List<string> { "document:read" },
        });
        await SeedUserAsync(new User
        {
            Id = userId,
            Email = email,
            DisplayName = "First Login",
            Status = "active",
            GoogleSub = null,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        const string googleSub = "google-sub-first-login";
        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: googleSub,
            Email: email,
            EmailVerified: true,
            Name: "First Login",
            Picture: null);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token ="good" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var reloaded = await db.Users.FindAsync(userId);
        Assert.NotNull(reloaded);
        Assert.Equal(googleSub, reloaded!.GoogleSub);
    }

    private async Task SeedUserAsync(User user)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    private async Task SeedRoleAsync(Role role)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Roles.Add(role);
        await db.SaveChangesAsync();
    }
}
