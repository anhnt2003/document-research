using Asp.Versioning;
using DocumentResearch.Api.Contracts.Permissions;
using DocumentResearch.Api.Permissions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentResearch.Api.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Tags("Permissions")]
public sealed class PermissionsController : ControllerBase
{
    [HttpGet]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [ProducesResponseType<IReadOnlyList<PermissionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public ActionResult<IReadOnlyList<PermissionDto>> List()
    {
        var items = PermissionCatalog.All
            .Select(p => new PermissionDto(p.Key, p.Group, p.Label, p.Description))
            .ToList();
        return Ok(items);
    }
}
