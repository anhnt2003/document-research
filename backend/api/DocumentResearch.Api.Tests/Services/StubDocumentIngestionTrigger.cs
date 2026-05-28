using System.Collections.Concurrent;
using DocumentResearch.Api.Services;

namespace DocumentResearch.Api.Tests.Services;

public sealed class StubDocumentIngestionTrigger : IDocumentIngestionTrigger
{
    private readonly ConcurrentBag<Guid> _calls = new();

    public IReadOnlyCollection<Guid> Calls => _calls;

    public Task TriggerAsync(Guid documentId, CancellationToken ct)
    {
        _calls.Add(documentId);
        return Task.CompletedTask;
    }
}
