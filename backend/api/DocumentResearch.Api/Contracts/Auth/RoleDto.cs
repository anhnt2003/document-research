namespace DocumentResearch.Api.Contracts.Auth;

public sealed record RoleDto(
    string Id,
    string Name,
    string? Description,
    bool IsSystem,
    IReadOnlyList<string> PermissionKeys);
