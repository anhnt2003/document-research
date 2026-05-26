using Google.Apis.Auth;
using Microsoft.Extensions.Options;

namespace DocumentResearch.Api.Auth;

public sealed class GoogleTokenVerifier : IGoogleTokenVerifier
{
    private readonly IOptions<AuthOptions> _options;

    public GoogleTokenVerifier(IOptions<AuthOptions> options)
    {
        _options = options;
    }

    public async Task<GoogleIdentity> VerifyAsync(string idToken, CancellationToken ct = default)
    {
        var clientId = _options.Value.Google.ClientId;
        if (string.IsNullOrWhiteSpace(clientId))
        {
            throw new InvalidOperationException("Auth:Google:ClientId is not configured.");
        }

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId },
            });
        }
        catch (InvalidJwtException ex)
        {
            throw new GoogleTokenInvalidException("Google rejected the ID token.", ex);
        }

        return new GoogleIdentity(
            Subject: payload.Subject,
            Email: payload.Email,
            EmailVerified: payload.EmailVerified,
            Name: payload.Name,
            Picture: payload.Picture);
    }
}
