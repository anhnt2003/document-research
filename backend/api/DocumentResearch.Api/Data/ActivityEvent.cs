namespace DocumentResearch.Api.Data;

public sealed class ActivityEvent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Target { get; set; }
    public string? IpAddress { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public User? User { get; set; }
}
