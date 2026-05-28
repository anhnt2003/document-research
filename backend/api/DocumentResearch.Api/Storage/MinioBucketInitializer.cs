using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace DocumentResearch.Api.Storage;

public sealed class MinioBucketInitializer(
    IOptions<MinioOptions> options,
    ILogger<MinioBucketInitializer> logger) : IHostedService
{
    private readonly MinioOptions _options = options.Value;

    public async Task StartAsync(CancellationToken ct)
    {
        var client = new MinioClient()
            .WithEndpoint(_options.Endpoint)
            .WithCredentials(_options.AccessKey, _options.SecretKey)
            .WithSSL(_options.UseSsl)
            .Build();

        var exists = await client.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(_options.Bucket), ct);
        if (!exists)
        {
            logger.LogInformation("Creating MinIO bucket '{Bucket}'", _options.Bucket);
            await client.MakeBucketAsync(
                new MakeBucketArgs().WithBucket(_options.Bucket), ct);
        }
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
