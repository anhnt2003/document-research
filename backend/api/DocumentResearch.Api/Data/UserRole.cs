namespace DocumentResearch.Api.Data;

public sealed class UserRole
{
    public Guid UserId { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public User User { get; set; } = null!;
    public Role Role { get; set; } = null!;
}
