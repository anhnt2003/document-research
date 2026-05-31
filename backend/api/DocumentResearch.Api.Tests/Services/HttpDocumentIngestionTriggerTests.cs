using System.Net;
using DocumentResearch.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace DocumentResearch.Api.Tests.Services;

public class HttpDocumentIngestionTriggerTests
{
    private sealed class CapturingHandler : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Request = request;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NoContent));
        }
    }

    private sealed class StubHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    [Fact]
    public async Task TriggerAsync_SendsServiceTokenHeader_ToCore()
    {
        var handler = new CapturingHandler();
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://core") };
        var options = Options.Create(new CoreOptions
        {
            BaseUrl = "http://core",
            ServiceToken = "svc-secret-123",
        });
        var trigger = new HttpDocumentIngestionTrigger(
            new StubHttpClientFactory(httpClient),
            NullLogger<HttpDocumentIngestionTrigger>.Instance,
            options);

        await trigger.TriggerAsync(Guid.NewGuid(), CancellationToken.None);

        Assert.NotNull(handler.Request);
        Assert.True(handler.Request!.Headers.Contains("X-Service-Token"));
        Assert.Equal("svc-secret-123", handler.Request.Headers.GetValues("X-Service-Token").Single());
    }
}
