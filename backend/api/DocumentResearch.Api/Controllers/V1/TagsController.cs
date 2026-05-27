using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Asp.Versioning;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Contracts.Documents;
using DocumentResearch.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentResearch.Api.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
[Tags("Tags")]
public sealed class TagsController : ControllerBase
{
    private readonly ITagService _tags;
    private readonly IAccountService _account;

    public TagsController(ITagService tags, IAccountService account)
    {
        _tags = tags;
        _account = account;
    }

    private bool TryGetUserId(out Guid userId)
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out userId);
    }

    private string? Ip => HttpContext.Connection.RemoteIpAddress?.ToString();

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<TagDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<TagDto>>> List(CancellationToken ct)
    {
        var items = await _tags.ListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    [RequirePermission("tags:write")]
    [ProducesResponseType<TagDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TagDto>> Create(
        [FromBody] CreateTagRequest request,
        CancellationToken ct)
    {
        var outcome = await _tags.CreateAsync(request, ct);
        if (outcome is CreateTagOutcome.Success success && TryGetUserId(out var userId))
        {
            await _account.LogAsync(userId, "create_tag", target: success.Tag.Id.ToString(), ipAddress: Ip, ct);
        }
        return outcome switch
        {
            CreateTagOutcome.Success s => CreatedAtAction(nameof(List), new { id = s.Tag.Id }, s.Tag),
            CreateTagOutcome.InvalidColor ic => Problem(
                type: ErrorTypes.InvalidTagColor,
                title: "Invalid tag color",
                statusCode: StatusCodes.Status400BadRequest,
                detail: $"Color '{ic.Color}' is not allowed. Use one of: oxblood, amber, moss, rust, ink."),
            CreateTagOutcome.ParentNotFound pnf => Problem(
                type: ErrorTypes.TagNotFound,
                title: "Parent tag not found",
                statusCode: StatusCodes.Status404NotFound,
                detail: $"No parent tag with id={pnf.ParentId}."),
            CreateTagOutcome.DuplicateLabel dl => Problem(
                type: ErrorTypes.DuplicateTagLabel,
                title: "Duplicate tag label",
                statusCode: StatusCodes.Status409Conflict,
                detail: $"A tag with label '{dl.Label}' already exists under this parent."),
            _ => throw new InvalidOperationException("Unhandled outcome."),
        };
    }

    [HttpPut("{id:guid}")]
    [RequirePermission("tags:write")]
    [ProducesResponseType<TagDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TagDto>> Update(
        Guid id,
        [FromBody] UpdateTagRequest request,
        CancellationToken ct)
    {
        var outcome = await _tags.UpdateAsync(id, request, ct);
        if (outcome is UpdateTagOutcome.Success && TryGetUserId(out var userId))
        {
            await _account.LogAsync(userId, "update_tag", target: id.ToString(), ipAddress: Ip, ct);
        }
        return outcome switch
        {
            UpdateTagOutcome.Success s => Ok(s.Tag),
            UpdateTagOutcome.TagNotFound => Problem(
                type: ErrorTypes.TagNotFound,
                title: "Tag not found",
                statusCode: StatusCodes.Status404NotFound,
                detail: $"No tag with id={id}."),
            UpdateTagOutcome.InvalidColor ic => Problem(
                type: ErrorTypes.InvalidTagColor,
                title: "Invalid tag color",
                statusCode: StatusCodes.Status400BadRequest,
                detail: $"Color '{ic.Color}' is not allowed. Use one of: oxblood, amber, moss, rust, ink."),
            UpdateTagOutcome.ParentNotFound pnf => Problem(
                type: ErrorTypes.TagNotFound,
                title: "Parent tag not found",
                statusCode: StatusCodes.Status404NotFound,
                detail: $"No parent tag with id={pnf.ParentId}."),
            UpdateTagOutcome.Cycle => Problem(
                type: ErrorTypes.TagCycle,
                title: "Tag cycle",
                statusCode: StatusCodes.Status400BadRequest,
                detail: "The requested parent would create a cycle in the tag hierarchy."),
            UpdateTagOutcome.DuplicateLabel dl => Problem(
                type: ErrorTypes.DuplicateTagLabel,
                title: "Duplicate tag label",
                statusCode: StatusCodes.Status409Conflict,
                detail: $"A tag with label '{dl.Label}' already exists under this parent."),
            _ => throw new InvalidOperationException("Unhandled outcome."),
        };
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission("tags:write")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var outcome = await _tags.DeleteAsync(id, ct);
        if (outcome is DeleteTagOutcome.Success && TryGetUserId(out var userId))
        {
            await _account.LogAsync(userId, "delete_tag", target: id.ToString(), ipAddress: Ip, ct);
        }
        return outcome switch
        {
            DeleteTagOutcome.Success => NoContent(),
            DeleteTagOutcome.TagNotFound => Problem(
                type: ErrorTypes.TagNotFound,
                title: "Tag not found",
                statusCode: StatusCodes.Status404NotFound,
                detail: $"No tag with id={id}."),
            DeleteTagOutcome.HasChildren => Problem(
                type: ErrorTypes.TagHasChildren,
                title: "Tag has children",
                statusCode: StatusCodes.Status409Conflict,
                detail: "Cannot delete a tag with children. Delete the children first or detach them."),
            _ => throw new InvalidOperationException("Unhandled outcome."),
        };
    }
}
