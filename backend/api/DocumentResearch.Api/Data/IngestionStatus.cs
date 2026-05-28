namespace DocumentResearch.Api.Data;

public enum IngestionStatus
{
    None,
    Pending,
    Extracting,
    Embedding,
    Ready,
    Failed,
}
