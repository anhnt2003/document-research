using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Auth;

public class MeEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public MeEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_Me_ReturnsCurrentUser_WhenAuthenticated()
    {
        var userId = Guid.NewGuid();
        var email = $"me-{Guid.NewGuid():N}@example.com";
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
            DisplayName = "Me User",
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UserRoles = new List<UserRole>
            {
                new() { RoleId = "role-admin" },
            },
        });

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: "google-sub-me",
            Email: email,
            EmailVerified: true,
            Name: "Me User",
            Picture: null);

        var signIn = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "good" });
        signIn.EnsureSuccessStatusCode();
        var token = (await signIn.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("token").GetString();

        using var meRequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        meRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var meResponse = await _client.SendAsync(meRequest);

        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);
        var payload = await meResponse.Content.ReadFromJsonAsync<JsonElement>();

        var user = payload.GetProperty("user");
        Assert.Equal(userId, user.GetProperty("id").GetGuid());
        Assert.Equal(email, user.GetProperty("email").GetString());

        var roles = payload.GetProperty("roles").EnumerateArray().ToList();
        Assert.Single(roles);
        Assert.Equal("role-admin", roles[0].GetProperty("id").GetString());

        var permissionKeys = payload.GetProperty("permission_keys").EnumerateArray()
            .Select(e => e.GetString()).ToList();
        Assert.Contains("*", permissionKeys);
    }

    [Fact]
    public async Task Get_Me_Returns401_WhenNoBearer()
    {
        var response = await _client.GetAsync("/api/v1/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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
        if (await db.Roles.FindAsync(role.Id) is not null) return;
        db.Roles.Add(role);
        await db.SaveChangesAsync();
    }
}
