namespace DocumentResearch.Api.Contracts.Documents;

public sealed record UpdateTagRequest(string Label, string Color, Guid? ParentId);
