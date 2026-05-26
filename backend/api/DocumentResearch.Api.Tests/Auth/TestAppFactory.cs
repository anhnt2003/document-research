using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
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
        });
    }
}
