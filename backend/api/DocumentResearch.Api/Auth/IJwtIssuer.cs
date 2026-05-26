using DocumentResearch.Api.Data;

namespace DocumentResearch.Api.Auth;

public sealed record IssuedToken(string Token, DateTimeOffset ExpiresAt);

public interface IJwtIssuer
{
    IssuedToken Issue(User user, IReadOnlyList<Role> roles);
}
