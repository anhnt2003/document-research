namespace DocumentResearch.Api.Contracts.Documents;

public sealed record DocumentDto(
    Guid Id,
    string Title,
    string Body,
    DateTimeOffset CreatedAt,
    string? FileName,
    string? MimeType,
    long? SizeBytes,
    string IngestionStatus);
