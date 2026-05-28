using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Services;
using DocumentResearch.Api.Storage;
using DocumentResearch.Api.Tests.Services;
using DocumentResearch.Api.Tests.Storage;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DocumentResearch.Api.Tests.Auth;

public sealed class TestAppFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"auth-tests-{Guid.NewGuid()}";

    public StubGoogleTokenVerifier Verifier { get; } = new();

    public InMemoryFileStorage FileStorage { get; } = new();

    public StubDocumentIngestionTrigger IngestionTrigger { get; } = new();

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        return base.CreateHost(builder);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Auth:Google:ClientId"] = "test-client-id.apps.googleusercontent.com",
                ["Auth:Jwt:Issuer"] = "docres-tests",
                ["Auth:Jwt:Audience"] = "docres-tests",
                ["Auth:Jwt:SigningKey"] = "test-signing-key-must-be-long-enough-for-hs256-32b",
                ["Auth:Jwt:LifetimeDays"] = "7",
                ["Documents:MaxBytes"] = "1024",
            });
        });

        builder.ConfigureServices(services =>
        {
            var dbDescriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (dbDescriptor is not null)
            {
                services.Remove(dbDescriptor);
            }

            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));

            var verifierDescriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(IGoogleTokenVerifier));
            if (verifierDescriptor is not null)
            {
                services.Remove(verifierDescriptor);
            }

            services.AddSingleton<IGoogleTokenVerifier>(Verifier);

            var storageDescriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(IFileStorage));
            if (storageDescriptor is not null)
            {
                services.Remove(storageDescriptor);
            }
            services.AddSingleton<IFileStorage>(FileStorage);

            var triggerDescriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(IDocumentIngestionTrigger));
            if (triggerDescriptor is not null)
            {
                services.Remove(triggerDescriptor);
            }
            services.AddSingleton<IDocumentIngestionTrigger>(IngestionTrigger);
        });
    }
}
