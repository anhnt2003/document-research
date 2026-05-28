using DocumentResearch.Api.Storage;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using Testcontainers.Minio;

namespace DocumentResearch.Api.Tests.Storage;

public sealed class MinioFileStorageTests : IAsyncLifetime
{
    private const string AccessKey = "minioadmin";
    private const string SecretKey = "minioadmin";

    private readonly MinioContainer _minio = new MinioBuilder("minio/minio:latest")
        .WithUsername(AccessKey)
        .WithPassword(SecretKey)
        .Build();

    public Task InitializeAsync() => _minio.StartAsync();

    public Task DisposeAsync() => _minio.DisposeAsync().AsTask();

    [Fact]
    public async Task PutAsync_ThenGetAsync_ReturnsSameBytes()
    {
        var bucket = await CreateBucketAsync();
        var sut = CreateSut(bucket);
        var key = "sample.txt";
        var content = "hello world"u8.ToArray();

        await sut.PutAsync(key, new MemoryStream(content), "text/plain", CancellationToken.None);

        await using var stream = await sut.GetAsync(key, CancellationToken.None);
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms);

        Assert.Equal(content, ms.ToArray());
    }

    [Fact]
    public async Task GetAsync_Throws_FileNotFoundInStorage_WhenKeyMissing()
    {
        var bucket = await CreateBucketAsync();
        var sut = CreateSut(bucket);

        await Assert.ThrowsAsync<FileNotFoundInStorageException>(() =>
            sut.GetAsync("nonexistent.txt", CancellationToken.None));
    }

    [Fact]
    public async Task DeleteAsync_RemovesObject()
    {
        var bucket = await CreateBucketAsync();
        var sut = CreateSut(bucket);
        var key = "to-delete.txt";
        await sut.PutAsync(key, new MemoryStream("payload"u8.ToArray()), "text/plain", CancellationToken.None);

        await sut.DeleteAsync(key, CancellationToken.None);

        Assert.False(await ObjectExistsAsync(bucket, key));
    }

    [Fact]
    public async Task GetPresignedUrlAsync_ReturnsUrlThatGrantsRead()
    {
        var bucket = await CreateBucketAsync();
        var sut = CreateSut(bucket);
        var key = "presigned.txt";
        var content = "presigned-content"u8.ToArray();
        await sut.PutAsync(key, new MemoryStream(content), "text/plain", CancellationToken.None);

        var url = await sut.GetPresignedUrlAsync(key, TimeSpan.FromMinutes(5), CancellationToken.None);

        using var http = new HttpClient();
        var resp = await http.GetAsync(url, CancellationToken.None);
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadAsByteArrayAsync(CancellationToken.None);
        Assert.Equal(content, body);
    }

    private async Task<bool> ObjectExistsAsync(string bucket, string key)
    {
        var endpoint = new Uri(_minio.GetConnectionString());
        using var client = new MinioClient()
            .WithEndpoint(endpoint.Host, endpoint.Port)
            .WithCredentials(AccessKey, SecretKey)
            .Build();
        try
        {
            await client.StatObjectAsync(new StatObjectArgs().WithBucket(bucket).WithObject(key));
            return true;
        }
        catch (Minio.Exceptions.ObjectNotFoundException)
        {
            return false;
        }
    }

    private MinioFileStorage CreateSut(string bucket)
    {
        var endpoint = new Uri(_minio.GetConnectionString());
        var options = Options.Create(new MinioOptions
        {
            Endpoint = $"{endpoint.Host}:{endpoint.Port}",
            AccessKey = AccessKey,
            SecretKey = SecretKey,
            Bucket = bucket,
            UseSsl = false,
        });
        return new MinioFileStorage(options);
    }

    private async Task<string> CreateBucketAsync()
    {
        var bucket = $"test-{Guid.NewGuid():N}";
        var endpoint = new Uri(_minio.GetConnectionString());
        using var client = new MinioClient()
            .WithEndpoint(endpoint.Host, endpoint.Port)
            .WithCredentials(AccessKey, SecretKey)
            .Build();
        await client.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucket));
        return bucket;
    }
}
