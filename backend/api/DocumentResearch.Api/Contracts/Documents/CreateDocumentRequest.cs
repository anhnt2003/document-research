namespace DocumentResearch.Api.Contracts.Documents;

public sealed class CreateDocumentRequest
{
    public required Stream Content { get; init; }
    public required string FileName { get; init; }
    public required string MimeType { get; init; }
    public required long SizeBytes { get; init; }
    public string? Title { get; init; }
}
