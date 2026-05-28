using DocumentResearch.Api.Contracts.Documents;

namespace DocumentResearch.Api.Services;

public abstract record CreateDocumentOutcome
{
    public sealed record Success(DocumentDto Document) : CreateDocumentOutcome;
    public sealed record Deduplicated(DocumentDto Document) : CreateDocumentOutcome;
    public sealed record FileTooLarge(long ActualBytes, long MaxBytes) : CreateDocumentOutcome;
    public sealed record UnsupportedMime(string ActualMime, IReadOnlyList<string> AllowedMimes) : CreateDocumentOutcome;
}
