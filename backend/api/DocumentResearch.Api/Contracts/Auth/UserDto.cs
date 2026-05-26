namespace DocumentResearch.Api.Contracts.Auth;

public sealed record UserDto(
    Guid Id,
    string Email,
    string DisplayName,
    string? AvatarUrl,
    string Status,
    IReadOnlyList<string> RoleIds,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastLoginAt);
