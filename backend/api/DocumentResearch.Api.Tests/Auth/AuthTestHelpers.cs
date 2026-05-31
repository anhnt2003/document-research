using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentResearch.Api.Tests.Auth;

/// <summary>
/// Shared sign-in helpers for integration tests. Seeds a user with a role carrying
/// the requested permission keys, primes the stubbed Google verifier, then signs in
/// through the real <c>POST /api/v1/auth/google</c> endpoint and returns the JWT.
/// </summary>
public static class AuthTestHelpers
{
    /// <summary>A signed-in test user: the bearer token plus the seeded user's id.</summary>
    public sealed record SignedInUser(string Token, Guid UserId);

    /// <summary>
    /// Seed a user whose single role grants exactly <paramref name="permissionKeys"/>,
    /// sign in, and return both the bearer token and the user's id.
    /// </summary>
    public static Task<SignedInUser> RegisterAndSignInAsync(
        this TestAppFactory factory,
        HttpClient client,
        params string[] permissionKeys) =>
        factory.RegisterAndSignInWithRoleAsync(client, $"role-{Guid.NewGuid():N}", permissionKeys);

    public static async Task<SignedInUser> RegisterAndSignInWithRoleAsync(
        this TestAppFactory factory,
        HttpClient client,
        string roleId,
        params string[] permissionKeys)
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var userId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var existingRole = await db.Roles.FindAsync(roleId);
            if (existingRole is null)
            {
                db.Roles.Add(new Role
                {
                    Id = roleId,
                    Name = "Test Role",
                    IsSystem = false,
                    PermissionKeys = permissionKeys.ToList(),
                });
            }
            db.Users.Add(new User
            {
                Id = userId,
                Email = email,
                DisplayName = "Test User",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UserRoles = new List<UserRole> { new() { RoleId = roleId } },
            });
            await db.SaveChangesAsync();
        }

        factory.Verifier.Handler = _ => new GoogleIdentity(
            Subject: $"google-sub-{Guid.NewGuid():N}",
            Email: email,
            EmailVerified: true,
            Name: "Test User",
            Picture: null);

        var signIn = await client.PostAsJsonAsync("/api/v1/auth/google", new { id_token = "good" });
        signIn.EnsureSuccessStatusCode();
        var token = (await signIn.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("token").GetString()!;
        return new SignedInUser(token, userId);
    }

    /// <summary>Sign in as a user whose single role grants exactly <paramref name="permissionKeys"/>.</summary>
    public static async Task<string> SignInWithPermissionsAsync(
        this TestAppFactory factory,
        HttpClient client,
        params string[] permissionKeys) =>
        (await factory.RegisterAndSignInAsync(client, permissionKeys)).Token;

    /// <summary>Sign in as an administrator (role id <c>admin</c>).</summary>
    public static async Task<string> SignInAsAdminAsync(this TestAppFactory factory, HttpClient client) =>
        (await factory.RegisterAndSignInWithRoleAsync(client, "admin")).Token;
}
