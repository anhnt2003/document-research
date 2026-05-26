namespace DocumentResearch.Api.Auth;

public sealed record GoogleIdentity(
    string Subject,
    string Email,
    bool EmailVerified,
    string? Name,
    string? Picture);

public sealed class GoogleTokenInvalidException : Exception
{
    public GoogleTokenInvalidException(string message) : base(message) { }
    public GoogleTokenInvalidException(string message, Exception inner) : base(message, inner) { }
}

public interface IGoogleTokenVerifier
{
    Task<GoogleIdentity> VerifyAsync(string idToken, CancellationToken ct = default);
}
