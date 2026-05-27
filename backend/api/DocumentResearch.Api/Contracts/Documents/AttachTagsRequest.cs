namespace DocumentResearch.Api.Contracts.Documents;

public sealed record AttachTagsRequest(IReadOnlyList<Guid> TagIds);
