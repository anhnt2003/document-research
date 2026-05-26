using DocumentResearch.Api.Auth;

namespace DocumentResearch.Api.Tests.Auth;

public sealed class StubGoogleTokenVerifier : IGoogleTokenVerifier
{
    public Func<string, GoogleIdentity>? Handler { get; set; }

    public Task<GoogleIdentity> VerifyAsync(string idToken, CancellationToken ct = default)
    {
        if (Handler is null)
        {
            throw new InvalidOperationException(
                "StubGoogleTokenVerifier.Handler must be set by the test before calling the endpoint.");
        }

        return Task.FromResult(Handler(idToken));
    }
}
