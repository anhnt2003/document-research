using DocumentResearch.Api.Contracts.Auth;

namespace DocumentResearch.Api.Services;

public interface IAuthService
{
    Task<SignInOutcome> SignInWithGoogleAsync(string? idToken, CancellationToken ct);

    Task<MeOutcome> GetMeAsync(Guid userId, CancellationToken ct);
}

public abstract record SignInOutcome
{
    private SignInOutcome() { }

    public sealed record Success(SignInResponse Response) : SignInOutcome;
    public sealed record InvalidRequest(string Detail) : SignInOutcome;
    public sealed record GoogleTokenInvalid(string Detail) : SignInOutcome;
    public sealed record EmailNotVerified : SignInOutcome;
    public sealed record UserNotProvisioned(string Email) : SignInOutcome;
    public sealed record UserLocked : SignInOutcome;
}

public abstract record MeOutcome
{
    private MeOutcome() { }

    public sealed record Success(MeResponse Response) : MeOutcome;
    public sealed record UserNotFound : MeOutcome;
}
