namespace DocumentResearch.Api.Contracts.Documents;

public sealed record TagDto(
    Guid Id,
    string Label,
    string Color,
    Guid? ParentId,
    int DocumentCount);
