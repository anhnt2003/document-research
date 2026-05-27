using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Asp.Versioning;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Contracts.Account;
using DocumentResearch.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentResearch.Api.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
[Tags("Account")]
public sealed class AccountController : ControllerBase
{
    private const int DefaultLimit = 50;
    private readonly IAccountService _account;

    public AccountController(IAccountService account)
    {
        _account = account;
    }

    [HttpGet("activity")]
    [ProducesResponseType<IReadOnlyList<ActivityEventDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<ActivityEventDto>>> GetActivity(
        [FromQuery] int? limit,
        CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Problem(
                type: ErrorTypes.GoogleTokenInvalid,
                title: "Invalid token",
                statusCode: StatusCodes.Status401Unauthorized,
                detail: "Token does not contain a valid subject claim.");
        }

        var events = await _account.GetActivityAsync(userId, limit ?? DefaultLimit, ct);
        var dtos = events
            .Select(e => new ActivityEventDto(e.Id, e.UserId, e.Action, e.Target, e.OccurredAt))
            .ToList();
        return Ok(dtos);
    }

    private bool TryGetUserId(out Guid userId)
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out userId);
    }
}
