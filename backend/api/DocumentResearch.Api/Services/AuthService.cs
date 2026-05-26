using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Contracts.Auth;
using DocumentResearch.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DocumentResearch.Api.Services;

public sealed class AuthService : IAuthService
{
    private readonly IGoogleTokenVerifier _googleVerifier;
    private readonly IJwtIssuer _jwtIssuer;
    private readonly AppDbContext _db;
    private readonly TimeProvider _clock;

    public AuthService(
        IGoogleTokenVerifier googleVerifier,
        IJwtIssuer jwtIssuer,
        AppDbContext db,
        TimeProvider clock)
    {
        _googleVerifier = googleVerifier;
        _jwtIssuer = jwtIssuer;
        _db = db;
        _clock = clock;
    }

    public async Task<SignInOutcome> SignInWithGoogleAsync(string? idToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(idToken))
        {
            return new SignInOutcome.InvalidRequest("idToken is required.");
        }

        GoogleIdentity identity;
        try
        {
            identity = await _googleVerifier.VerifyAsync(idToken, ct);
        }
        catch (GoogleTokenInvalidException ex)
        {
            return new SignInOutcome.GoogleTokenInvalid(ex.Message);
        }

        if (!identity.EmailVerified)
        {
            return new SignInOutcome.EmailNotVerified();
        }

        var emailLower = identity.Email.ToLowerInvariant();
        var user = await _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower, ct);
        if (user is null)
        {
            return new SignInOutcome.UserNotProvisioned(identity.Email);
        }

        if (user.Status == "locked")
        {
            return new SignInOutcome.UserLocked();
        }

        if (user.GoogleSub is null)
        {
            user.GoogleSub = identity.Subject;
        }
        else if (user.GoogleSub != identity.Subject)
        {
            return new SignInOutcome.GoogleTokenInvalid(
                "Google subject does not match the account on file for this email.");
        }

        user.LastLoginAt = _clock.GetUtcNow();
        if (!string.IsNullOrWhiteSpace(identity.Name))
        {
            user.DisplayName = identity.Name;
        }
        if (!string.IsNullOrWhiteSpace(identity.Picture))
        {
            user.AvatarUrl = identity.Picture;
        }
        await _db.SaveChangesAsync(ct);

        var roles = user.UserRoles.Select(ur => ur.Role).ToList();
        var issued = _jwtIssuer.Issue(user, roles);

        return new SignInOutcome.Success(new SignInResponse(
            Token: issued.Token,
            ExpiresAt: issued.ExpiresAt,
            User: ToUserDto(user),
            Roles: roles.Select(ToRoleDto).ToList()));
    }

    public async Task<MeOutcome> GetMeAsync(Guid userId, CancellationToken ct)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            return new MeOutcome.UserNotFound();
        }

        var roles = user.UserRoles.Select(ur => ur.Role).ToList();
        var permissionKeys = roles
            .SelectMany(r => r.PermissionKeys)
            .Distinct()
            .ToList();

        return new MeOutcome.Success(new MeResponse(
            User: ToUserDto(user),
            Roles: roles.Select(ToRoleDto).ToList(),
            PermissionKeys: permissionKeys));
    }

    private static UserDto ToUserDto(User user) => new(
        Id: user.Id,
        Email: user.Email,
        DisplayName: user.DisplayName,
        AvatarUrl: user.AvatarUrl,
        Status: user.Status,
        RoleIds: user.UserRoles.Select(ur => ur.RoleId).ToList(),
        CreatedAt: user.CreatedAt,
        LastLoginAt: user.LastLoginAt);

    private static RoleDto ToRoleDto(Role role) => new(
        Id: role.Id,
        Name: role.Name,
        Description: role.Description,
        IsSystem: role.IsSystem,
        PermissionKeys: role.PermissionKeys.ToList());
}
