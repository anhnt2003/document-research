using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using Minio.Exceptions;

namespace DocumentResearch.Api.Storage;

public sealed class MinioFileStorage : IFileStorage
{
    private readonly MinioOptions _options;
    private readonly Lazy<IMinioClient> _client;

    public MinioFileStorage(IOptions<MinioOptions> options)
    {
        _options = options.Value;
        _client = new Lazy<IMinioClient>(() => new MinioClient()
            .WithEndpoint(_options.Endpoint)
            .WithCredentials(_options.AccessKey, _options.SecretKey)
            .WithSSL(_options.UseSsl)
            .Build());
    }

    public async Task PutAsync(string key, Stream content, string contentType, CancellationToken ct)
    {
        var args = new PutObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key)
            .WithStreamData(content)
            .WithObjectSize(content.Length)
            .WithContentType(contentType);
        await _client.Value.PutObjectAsync(args, ct);
    }

    public async Task<Stream> GetAsync(string key, CancellationToken ct)
    {
        var buffer = new MemoryStream();
        try
        {
            await _client.Value.GetObjectAsync(
                new GetObjectArgs()
                    .WithBucket(_options.Bucket)
                    .WithObject(key)
                    .WithCallbackStream(s => s.CopyTo(buffer)),
                ct);
        }
        catch (ObjectNotFoundException)
        {
            throw new FileNotFoundInStorageException(key);
        }
        buffer.Position = 0;
        return buffer;
    }

    public async Task DeleteAsync(string key, CancellationToken ct)
    {
        await _client.Value.RemoveObjectAsync(
            new RemoveObjectArgs().WithBucket(_options.Bucket).WithObject(key),
            ct);
    }

    public async Task<Uri> GetPresignedUrlAsync(string key, TimeSpan ttl, CancellationToken ct)
    {
        var url = await _client.Value.PresignedGetObjectAsync(
            new PresignedGetObjectArgs()
                .WithBucket(_options.Bucket)
                .WithObject(key)
                .WithExpiry((int)ttl.TotalSeconds));
        return new Uri(url);
    }
}
