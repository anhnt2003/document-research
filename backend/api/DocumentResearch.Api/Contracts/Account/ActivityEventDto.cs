namespace DocumentResearch.Api.Contracts.Account;

public sealed record ActivityEventDto(
    Guid Id,
    Guid UserId,
    string Action,
    string? Target,
    DateTimeOffset At);
