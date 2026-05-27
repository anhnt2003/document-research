using DocumentResearch.Api.Permissions;
using Microsoft.EntityFrameworkCore;

namespace DocumentResearch.Api.Data;

public static class SeedData
{
    private const string AdminRoleId = "admin";
    private const string AdminEmail = "anhtn0325@gmail.com";
    private const string AdminDisplayName = "Nguyen Tuan Anh";

    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (db.Database.IsRelational())
        {
            await db.Database.MigrateAsync(ct);
        }
        else
        {
            await db.Database.EnsureCreatedAsync(ct);
        }
        await SeedRolesAsync(db, ct);
        await SeedAdminUserAsync(db, ct);
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedRolesAsync(AppDbContext db, CancellationToken ct)
    {
        var allPermissions = PermissionCatalog.All.Select(p => p.Key).ToList();

        var admin = await db.Roles.FirstOrDefaultAsync(r => r.Id == AdminRoleId, ct);
        if (admin is null)
        {
            db.Roles.Add(new Role
            {
                Id = AdminRoleId,
                Name = "Administrator",
                Description = "Full system access.",
                IsSystem = true,
                PermissionKeys = allPermissions,
            });
        }
        else if (!admin.PermissionKeys.SequenceEqual(allPermissions))
        {
            admin.PermissionKeys = allPermissions;
        }
    }

    private static async Task SeedAdminUserAsync(AppDbContext db, CancellationToken ct)
    {
        var user = await db.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Email == AdminEmail, ct);

        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = AdminEmail,
                DisplayName = AdminDisplayName,
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
            };
            db.Users.Add(user);
        }

        var hasAdminRole = user.UserRoles.Any(ur => ur.RoleId == AdminRoleId);
        if (!hasAdminRole)
        {
            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = AdminRoleId });
        }
    }
}
