namespace DocumentResearch.Api.Data;

public class Document
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public ICollection<DocumentTag> DocumentTags { get; set; } = new List<DocumentTag>();

    public string? FileName { get; set; }
    public string? MimeType { get; set; }
    public long? SizeBytes { get; set; }
    public string? StorageKey { get; set; }
    public string? FileHash { get; set; }
    public IngestionStatus IngestionStatus { get; set; } = IngestionStatus.None;
    public string? IngestionError { get; set; }

    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }
}
