using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentResearch.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DocumentResearch.Api.Tests;

public class GetDocumentByIdEndpointTests : IClassFixture<GetDocumentByIdEndpointTests.TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private readonly HttpClient _client;

    public GetDocumentByIdEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_Document_ReturnsOk_WhenDocumentExists()
    {
        var documentId = Guid.NewGuid();
        await SeedDocumentAsync(new Document
        {
            Id = documentId,
            Title = "Existing Doc",
            Body = "Body content",
            CreatedAt = DateTimeOffset.UtcNow,
        });

        var response = await _client.GetAsync($"/api/v1/documents/{documentId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Get_Document_ReturnsNotFound_WhenIdDoesNotExist()
    {
        var missingId = Guid.NewGuid();

        var response = await _client.GetAsync($"/api/v1/documents/{missingId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Get_Document_ReturnsDocumentJson_WithIdTitleBodyCreatedAt()
    {
        var documentId = Guid.NewGuid();
        var createdAt = new DateTimeOffset(2026, 5, 1, 12, 30, 0, TimeSpan.Zero);
        await SeedDocumentAsync(new Document
        {
            Id = documentId,
            Title = "A Document",
            Body = "Hello world",
            CreatedAt = createdAt,
        });

        var response = await _client.GetAsync($"/api/v1/documents/{documentId}");
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(documentId, payload.GetProperty("id").GetGuid());
        Assert.Equal("A Document", payload.GetProperty("title").GetString());
        Assert.Equal("Hello world", payload.GetProperty("body").GetString());
        Assert.Equal(createdAt, payload.GetProperty("created_at").GetDateTimeOffset());
    }

    private async Task SeedDocumentAsync(Document document)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Documents.Add(document);
        await db.SaveChangesAsync();
    }

    public sealed class TestAppFactory : WebApplicationFactory<Program>
    {
        private readonly string _databaseName = $"documents-tests-{Guid.NewGuid()}";

        protected override IHost CreateHost(IHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            return base.CreateHost(builder);
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor is not null)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase(_databaseName));
            });
        }
    }
}
