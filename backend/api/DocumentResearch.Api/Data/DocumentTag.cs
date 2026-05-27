namespace DocumentResearch.Api.Data;

public class DocumentTag
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;
    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
    public DateTimeOffset AttachedAt { get; set; }
}
