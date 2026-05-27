using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Tests.Auth;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Permissions;

public class PermissionsEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public PermissionsEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_Permissions_Returns401_WhenNoBearer()
    {
        var response = await _client.GetAsync("/api/v1/permissions");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Get_Permissions_ReturnsCatalog_WhenAuthenticated()
    {
        var token = await SignInAndGetTokenAsync();

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/permissions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = payload.EnumerateArray().ToList();

        Assert.NotEmpty(items);
        foreach (var item in items)
        {
            Assert.False(string.IsNullOrWhiteSpace(item.GetProperty("key").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(item.GetProperty("group").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(item.GetProperty("label").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(item.GetProperty("description").GetString()));
        }
    }

    private async Task<string> SignInAndGetTokenAsync()
    {
        var email = $"permissions-{Guid.NewGuid():N}@example.com";
        await SeedRoleAsync(new Role
        {
            Id = "role-admin",
            Name = "Administrator",
            IsSystem = true,
            PermissionKeys = new List<string> { "*" },
        });
        await SeedUserAsync(new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = "Permissions User",
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UserRoles = new List<UserRole>
            {
                new() { RoleId = "role-admin" },
            },
        });

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Permissions User",
            Picture: null);

        var signIn = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "good" });
        signIn.EnsureSuccessStatusCode();
        var token = (await signIn.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("token").GetString();
        return token!;
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
