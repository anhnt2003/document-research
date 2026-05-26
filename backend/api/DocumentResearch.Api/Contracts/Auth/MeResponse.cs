namespace DocumentResearch.Api.Contracts.Auth;

public sealed record MeResponse(
    UserDto User,
    IReadOnlyList<RoleDto> Roles,
    IReadOnlyList<string> PermissionKeys);
