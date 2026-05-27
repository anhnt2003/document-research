namespace DocumentResearch.Api.Contracts.Documents;

public sealed record CreateTagRequest(string Label, string Color, Guid? ParentId);
