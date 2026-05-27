using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Asp.Versioning;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Contracts.Auth;
using DocumentResearch.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentResearch.Api.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Tags("Auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IAccountService _account;

    public AuthController(IAuthService auth, IAccountService account)
    {
        _auth = auth;
        _account = account;
    }

    [HttpPost("google")]
    [ProducesResponseType<SignInResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status423Locked)]
    public async Task<ActionResult<SignInResponse>> SignInWithGoogle(
        [FromBody] GoogleSignInRequest body,
        CancellationToken ct)
    {
        var result = await _auth.SignInWithGoogleAsync(body.IdToken, ct);
        return result switch
        {
            SignInOutcome.Success s => Ok(s.Response),
            SignInOutcome.InvalidRequest ir => Problem(
                type: ErrorTypes.InvalidRequest,
                title: "Invalid request",
                statusCode: StatusCodes.Status400BadRequest,
                detail: ir.Detail),
            SignInOutcome.GoogleTokenInvalid gi => Problem(
                type: ErrorTypes.GoogleTokenInvalid,
                title: "Google token invalid",
                statusCode: StatusCodes.Status401Unauthorized,
                detail: gi.Detail),
            SignInOutcome.EmailNotVerified => Problem(
                type: ErrorTypes.EmailNotVerified,
                title: "Email not verified",
                statusCode: StatusCodes.Status401Unauthorized,
                detail: "Google reports this account's email is not verified."),
            SignInOutcome.UserNotProvisioned unp => Problem(
                type: ErrorTypes.UserNotProvisioned,
                title: "User not provisioned",
                statusCode: StatusCodes.Status403Forbidden,
                detail: $"No account exists for {unp.Email}. Ask an administrator to provision access first."),
            SignInOutcome.UserLocked => Problem(
                type: ErrorTypes.UserLocked,
                title: "User locked",
                statusCode: StatusCodes.Status423Locked,
                detail: "This account is locked. Contact an administrator."),
            _ => throw new InvalidOperationException($"Unhandled SignInOutcome: {result.GetType().Name}"),
        };
    }

    [HttpGet("me")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [ProducesResponseType<MeResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<MeResponse>> Me(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Problem(
                type: ErrorTypes.GoogleTokenInvalid,
                title: "Invalid token",
                statusCode: StatusCodes.Status401Unauthorized,
                detail: "Token does not contain a valid subject claim.");
        }

        var result = await _auth.GetMeAsync(userId, ct);
        return result switch
        {
            MeOutcome.Success s => Ok(s.Response),
            MeOutcome.UserNotFound => Problem(
                type: ErrorTypes.UserNotProvisioned,
                title: "User not found",
                statusCode: StatusCodes.Status401Unauthorized,
                detail: "The account referenced by this token no longer exists."),
            _ => throw new InvalidOperationException($"Unhandled MeOutcome: {result.GetType().Name}"),
        };
    }

    [HttpPost("sign-out")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SignOutCurrent(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Problem(
                type: ErrorTypes.GoogleTokenInvalid,
                title: "Invalid token",
                statusCode: StatusCodes.Status401Unauthorized,
                detail: "Token does not contain a valid subject claim.");
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _account.LogAsync(userId, "sign_out", target: null, ipAddress: ip, ct);
        return NoContent();
    }

    private bool TryGetUserId(out Guid userId)
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out userId);
    }
}
