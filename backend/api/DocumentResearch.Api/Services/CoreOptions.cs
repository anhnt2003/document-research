namespace DocumentResearch.Api.Services;

public sealed class CoreOptions
{
    public const string SectionName = "Core";

    public string BaseUrl { get; set; } = "http://localhost:8000";

    /// <summary>Shared secret sent as X-Service-Token on service-to-service calls to core.</summary>
    public string ServiceToken { get; set; } = string.Empty;
}
