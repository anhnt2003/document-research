namespace DocumentResearch.Api.Contracts.Permissions;

public sealed record PermissionDto(
    string Key,
    string Group,
    string Label,
    string Description);
