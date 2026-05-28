namespace DocumentResearch.Api.Storage;

public sealed class MinioOptions
{
    public const string SectionName = "Storage:MinIO";

    public string Endpoint { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string Bucket { get; set; } = string.Empty;
    public bool UseSsl { get; set; }
}
