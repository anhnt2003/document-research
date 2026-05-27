using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Auth;

public class SignOutEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public SignOutEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_SignOut_Returns401_WhenNoBearer()
    {
        var response = await _client.PostAsync("/api/v1/auth/sign-out", content: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Post_SignOut_Returns204_AndLogsSignOutEvent()
    {
        var userId = Guid.NewGuid();
        var email = $"signout-{Guid.NewGuid():N}@example.com";
        await SeedUserWithRoleAsync(userId, email);
        var token = await SignInAsAsync(email);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/sign-out");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var signOuts = await db.ActivityEvents
            .Where(e => e.UserId == userId && e.Action == "sign_out")
            .ToListAsync();
        Assert.Single(signOuts);
    }

    private async Task<string> SignInAsAsync(string email)
    {
        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Sign-out User",
            Picture: null);

        var signIn = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "good" });
        signIn.EnsureSuccessStatusCode();
        return (await signIn.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("token").GetString()!;
    }

    private async Task SeedUserWithRoleAsync(Guid userId, string email)
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
            Id = userId,
            Email = email,
            DisplayName = "Sign-out User",
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UserRoles = new List<UserRole> { new() { RoleId = "role-admin" } },
        });
        await db.SaveChangesAsync();
    }
}
