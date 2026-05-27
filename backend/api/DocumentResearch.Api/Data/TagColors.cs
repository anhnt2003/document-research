namespace DocumentResearch.Api.Data;

public static class TagColors
{
    public static IReadOnlySet<string> Allowed { get; } = new HashSet<string>(StringComparer.Ordinal)
    {
        "oxblood",
        "amber",
        "moss",
        "rust",
        "ink",
    };
}
