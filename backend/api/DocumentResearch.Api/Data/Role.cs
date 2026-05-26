namespace DocumentResearch.Api.Data;

public sealed class Role
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public List<string> PermissionKeys { get; set; } = new();
    public List<UserRole> UserRoles { get; set; } = new();
}
