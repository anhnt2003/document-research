using System.Net;
using System.Net.Http.Json;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Auth;

public class SignInActivityLoggingTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public SignInActivityLoggingTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SuccessfulSignIn_LogsSignInActivityForUser()
    {
        var userId = Guid.NewGuid();
        var email = $"signin-{Guid.NewGuid():N}@example.com";
        await SeedUserWithRoleAsync(userId, email);

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Sign-in User",
            Picture: null);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "good" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var signIns = await db.ActivityEvents
            .Where(e => e.UserId == userId && e.Action == "sign_in")
            .ToListAsync();

        var signIn = Assert.Single(signIns);
        Assert.Equal("google", signIn.Target);
    }

    [Fact]
    public async Task LockedUserSignIn_DoesNotLogActivity()
    {
        var userId = Guid.NewGuid();
        var email = $"locked-{Guid.NewGuid():N}@example.com";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Users.Add(new User
            {
                Id = userId,
                Email = email,
                DisplayName = "Locked",
                Status = "locked",
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Locked",
            Picture: null);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "x" });
        Assert.Equal((HttpStatusCode)423, response.StatusCode);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var events = await verifyDb.ActivityEvents
            .Where(e => e.UserId == userId)
            .ToListAsync();
        Assert.Empty(events);
    }

    [Fact]
    public async Task InvalidGoogleToken_DoesNotLogActivity()
    {
        _factory.Verifier.Handler = _ =>
            throw new GoogleTokenInvalidException("bad token");

        var beforeCount = await CountAllActivityAsync();
        var response = await _client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "bad" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var afterCount = await CountAllActivityAsync();
        Assert.Equal(beforeCount, afterCount);
    }

    private async Task<int> CountAllActivityAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.ActivityEvents.CountAsync();
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
            DisplayName = "Sign-in User",
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UserRoles = new List<UserRole> { new() { RoleId = "role-admin" } },
        });
        await db.SaveChangesAsync();
    }
}
