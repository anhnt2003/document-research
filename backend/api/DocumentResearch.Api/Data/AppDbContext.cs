using Microsoft.EntityFrameworkCore;

namespace DocumentResearch.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Document> Documents => Set<Document>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<ActivityEvent> ActivityEvents => Set<ActivityEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(b =>
        {
            b.Property(u => u.Email).IsRequired().HasMaxLength(320);
            b.Property(u => u.DisplayName).IsRequired().HasMaxLength(200);
            b.Property(u => u.AvatarUrl).HasMaxLength(2048);
            b.Property(u => u.Status).IsRequired().HasMaxLength(32);
            b.Property(u => u.GoogleSub).HasMaxLength(128);
            b.HasIndex(u => u.Email).IsUnique();
            b.HasIndex(u => u.GoogleSub)
                .IsUnique()
                .HasFilter("\"GoogleSub\" IS NOT NULL");
        });

        modelBuilder.Entity<Role>(b =>
        {
            b.Property(r => r.Id).HasMaxLength(64);
            b.Property(r => r.Name).IsRequired().HasMaxLength(200);
            b.Property(r => r.Description).HasMaxLength(1000);
            b.Property(r => r.PermissionKeys).HasColumnType("text[]");
        });

        modelBuilder.Entity<UserRole>(b =>
        {
            b.HasKey(ur => new { ur.UserId, ur.RoleId });
            b.HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ActivityEvent>(b =>
        {
            b.Property(e => e.Action).IsRequired().HasMaxLength(64);
            b.Property(e => e.Target).HasMaxLength(200);
            b.Property(e => e.IpAddress).HasMaxLength(45);
            b.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(e => new { e.UserId, e.OccurredAt })
                .IsDescending(false, true);
        });
    }
}
