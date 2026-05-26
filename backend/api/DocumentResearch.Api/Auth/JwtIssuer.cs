using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DocumentResearch.Api.Data;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DocumentResearch.Api.Auth;

public sealed class JwtIssuer : IJwtIssuer
{
    private readonly IOptions<AuthOptions> _options;
    private readonly TimeProvider _clock;

    public JwtIssuer(IOptions<AuthOptions> options, TimeProvider clock)
    {
        _options = options;
        _clock = clock;
    }

    public IssuedToken Issue(User user, IReadOnlyList<Role> roles)
    {
        var jwt = _options.Value.Jwt;
        if (string.IsNullOrWhiteSpace(jwt.SigningKey))
        {
            throw new InvalidOperationException("Auth:Jwt:SigningKey is not configured.");
        }

        var now = _clock.GetUtcNow();
        var expiresAt = now.AddDays(jwt.LifetimeDays);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        if (!string.IsNullOrEmpty(user.DisplayName))
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Name, user.DisplayName));
        }

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role.Id));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwt.Issuer,
            audience: jwt.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: creds);

        var encoded = new JwtSecurityTokenHandler().WriteToken(token);
        return new IssuedToken(encoded, expiresAt);
    }
}
