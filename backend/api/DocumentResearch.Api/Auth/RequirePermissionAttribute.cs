using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DocumentResearch.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace DocumentResearch.Api.Auth;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
public sealed class RequirePermissionAttribute : TypeFilterAttribute
{
    public RequirePermissionAttribute(string permissionKey)
        : base(typeof(RequirePermissionFilter))
    {
        Arguments = new object[] { permissionKey };
    }
}

internal sealed class RequirePermissionFilter : IAsyncAuthorizationFilter
{
    private readonly string _permissionKey;
    private readonly AppDbContext _db;

    public RequirePermissionFilter(string permissionKey, AppDbContext db)
    {
        _permissionKey = permissionKey;
        _db = db;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (user.Identity is null || !user.Identity.IsAuthenticated)
        {
            // Let JwtBearer / [Authorize] produce 401 — but we still need to short-circuit.
            context.Result = new UnauthorizedResult();
            return;
        }

        var sub = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(sub, out var userId))
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Type = ErrorTypes.GoogleTokenInvalid,
                Title = "Invalid token",
                Status = StatusCodes.Status401Unauthorized,
                Detail = "Token does not contain a valid subject claim.",
            })
            { StatusCode = StatusCodes.Status401Unauthorized };
            return;
        }

        var permissionKeys = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .SelectMany(u => u.UserRoles.Select(ur => ur.Role.PermissionKeys))
            .ToListAsync();

        var allowed = permissionKeys
            .SelectMany(p => p)
            .Any(k => k == "*" || k == _permissionKey);
        if (!allowed)
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Type = ErrorTypes.PermissionDenied,
                Title = "Permission denied",
                Status = StatusCodes.Status403Forbidden,
                Detail = $"Missing required permission '{_permissionKey}'.",
            })
            { StatusCode = StatusCodes.Status403Forbidden };
        }
    }
}
