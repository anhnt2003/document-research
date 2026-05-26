namespace DocumentResearch.Api.Contracts.Auth;

public sealed record SignInResponse(
    string Token,
    DateTimeOffset ExpiresAt,
    UserDto User,
    IReadOnlyList<RoleDto> Roles);
