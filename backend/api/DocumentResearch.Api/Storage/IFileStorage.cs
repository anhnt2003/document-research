namespace DocumentResearch.Api.Storage;

public interface IFileStorage
{
    Task PutAsync(string key, Stream content, string contentType, CancellationToken ct);
    Task<Stream> GetAsync(string key, CancellationToken ct);
    Task DeleteAsync(string key, CancellationToken ct);
    Task<Uri> GetPresignedUrlAsync(string key, TimeSpan ttl, CancellationToken ct);
}

public sealed class FileNotFoundInStorageException(string key)
    : Exception($"Object with key '{key}' not found in storage.")
{
    public string Key { get; } = key;
}
