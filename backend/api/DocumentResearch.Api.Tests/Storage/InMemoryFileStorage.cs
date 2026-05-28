using System.Collections.Concurrent;
using DocumentResearch.Api.Storage;

namespace DocumentResearch.Api.Tests.Storage;

public sealed class InMemoryFileStorage : IFileStorage
{
    private readonly ConcurrentDictionary<string, byte[]> _store = new();

    public IReadOnlyDictionary<string, byte[]> Snapshot => _store;

    public async Task PutAsync(string key, Stream content, string contentType, CancellationToken ct)
    {
        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, ct);
        _store[key] = ms.ToArray();
    }

    public Task<Stream> GetAsync(string key, CancellationToken ct)
    {
        if (!_store.TryGetValue(key, out var bytes))
        {
            throw new FileNotFoundInStorageException(key);
        }
        return Task.FromResult<Stream>(new MemoryStream(bytes, writable: false));
    }

    public Task DeleteAsync(string key, CancellationToken ct)
    {
        _store.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task<Uri> GetPresignedUrlAsync(string key, TimeSpan ttl, CancellationToken ct)
    {
        return Task.FromResult(new Uri($"https://test.invalid/{key}"));
    }
}
