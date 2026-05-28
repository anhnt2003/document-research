namespace DocumentResearch.Api.Services;

public sealed class DocumentUploadOptions
{
    public const string SectionName = "Documents";

    public long MaxBytes { get; set; } = 25 * 1024 * 1024;

    public List<string> AllowedMimes { get; set; } =
    [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
    ];
}
