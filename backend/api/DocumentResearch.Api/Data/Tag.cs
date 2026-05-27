namespace DocumentResearch.Api.Data;

public class Tag
{
    public Guid Id { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Color { get; set; } = "ink";
    public Guid? ParentId { get; set; }
    public Tag? Parent { get; set; }
    public ICollection<Tag> Children { get; set; } = new List<Tag>();
    public ICollection<DocumentTag> DocumentTags { get; set; } = new List<DocumentTag>();
    public DateTimeOffset CreatedAt { get; set; }
}
