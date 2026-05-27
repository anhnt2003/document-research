using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Tests.Auth;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Account;

public class AccountActivityEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public AccountActivityEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_Activity_Returns401_WhenNoBearer()
    {
        var response = await _client.GetAsync("/api/v1/account/activity");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Get_Activity_ReturnsUsersEvents_SortedNewestFirst()
    {
        var userId = Guid.NewGuid();
        var email = $"activity-{Guid.NewGuid():N}@example.com";
        await SeedUserWithRoleAsync(userId, email);

        var now = DateTimeOffset.UtcNow;
        await SeedActivityAsync(new ActivityEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = "sign_in",
            Target = "google",
            OccurredAt = now.AddHours(-3),
        });
        await SeedActivityAsync(new ActivityEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = "sign_out",
            Target = null,
            OccurredAt = now.AddHours(-1),
        });
        await SeedActivityAsync(new ActivityEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = "sign_in",
            Target = "google",
            OccurredAt = now.AddHours(-2),
        });

        var token = await SignInAsAsync(email);

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/account/activity");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .EnumerateArray().ToList();

        // sign-in flow itself logs one event, so we expect 3 seeded + 1 from sign-in = 4.
        // Slice 4 only validates the 3 seeded events are returned + sorted DESC by 'at'.
        // We filter to events strictly older than 'now' to ignore the freshly logged sign_in.
        var seeded = items
            .Where(e => DateTimeOffset.Parse(e.GetProperty("at").GetString()!) < now)
            .ToList();
        Assert.Equal(3, seeded.Count);

        var times = seeded.Select(e => DateTimeOffset.Parse(e.GetProperty("at").GetString()!)).ToList();
        Assert.Equal(times.OrderByDescending(t => t).ToList(), times);

        var first = seeded[0];
        Assert.Equal(userId, first.GetProperty("user_id").GetGuid());
        Assert.Equal("sign_out", first.GetProperty("action").GetString());
    }

    [Fact]
    public async Task Get_Activity_DoesNotLeakOtherUsersEvents()
    {
        var userA = Guid.NewGuid();
        var emailA = $"a-{Guid.NewGuid():N}@example.com";
        var userB = Guid.NewGuid();
        var emailB = $"b-{Guid.NewGuid():N}@example.com";
        await SeedUserWithRoleAsync(userA, emailA);
        await SeedUserWithRoleAsync(userB, emailB);

        var now = DateTimeOffset.UtcNow;
        await SeedActivityAsync(new ActivityEvent
        {
            Id = Guid.NewGuid(),
            UserId = userB,
            Action = "sign_in",
            Target = "google",
            OccurredAt = now.AddHours(-5),
        });

        var tokenA = await SignInAsAsync(emailA);

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/account/activity");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = (await response.Content.ReadFromJsonAsync<JsonElement>())
            .EnumerateArray().ToList();

        Assert.DoesNotContain(items, e => e.GetProperty("user_id").GetGuid() == userB);
        Assert.All(items, e => Assert.Equal(userA, e.GetProperty("user_id").GetGuid()));
    }

    private async Task<string> SignInAsAsync(string email)
    {
        _factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Activity User",
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
            DisplayName = "Activity User",
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
            UserRoles = new List<UserRole> { new() { RoleId = "role-admin" } },
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedActivityAsync(ActivityEvent ev)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ActivityEvents.Add(ev);
        await db.SaveChangesAsync();
    }
}
