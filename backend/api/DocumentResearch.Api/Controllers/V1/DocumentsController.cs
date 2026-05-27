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
[Tags("Documents")]
public sealed class DocumentsController : ControllerBase
{
    private readonly IDocumentService _documents;
    private readonly ITagService _tags;
    private readonly IAccountService _account;

    public DocumentsController(IDocumentService documents, ITagService tags, IAccountService account)
    {
        _documents = documents;
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

    [HttpGet("{id:guid}")]
    [ProducesResponseType<DocumentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DocumentDto>> GetById(Guid id, CancellationToken ct)
    {
        var document = await _documents.GetByIdAsync(id, ct);
        if (document is null)
        {
            return Problem(
                type: ErrorTypes.DocumentNotFound,
                title: "Document not found",
                statusCode: StatusCodes.Status404NotFound,
                detail: $"No document with id={id}.");
        }

        return Ok(document);
    }

    [HttpGet("{id:guid}/tags")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [ProducesResponseType<IReadOnlyList<TagDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<TagDto>>> ListTags(Guid id, CancellationToken ct)
    {
        var tags = await _tags.ListForDocumentAsync(id, ct);
        if (tags is null)
        {
            return Problem(
                type: ErrorTypes.DocumentNotFound,
                title: "Document not found",
                statusCode: StatusCodes.Status404NotFound,
                detail: $"No document with id={id}.");
        }
        return Ok(tags);
    }

    [HttpPost("{id:guid}/tags")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [RequirePermission("tags:write")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AttachTags(
        Guid id,
        [FromBody] AttachTagsRequest request,
        CancellationToken ct)
    {
        var outcome = await _tags.AttachAsync(id, request.TagIds, ct);
        if (outcome is AttachTagsOutcome.Success && TryGetUserId(out var userId))
        {
            await _account.LogAsync(userId, "attach_tags", target: id.ToString(), ipAddress: Ip, ct);
        }
        return outcome switch
        {
            AttachTagsOutcome.Success => NoContent(),
            AttachTagsOutcome.DocumentNotFound => Problem(
                type: ErrorTypes.DocumentNotFound,
                title: "Document not found",
                statusCode: StatusCodes.Status404NotFound,
                detail: $"No document with id={id}."),
            AttachTagsOutcome.TagsNotFound tnf => Problem(
                type: ErrorTypes.TagNotFound,
                title: "Tags not found",
                statusCode: StatusCodes.Status404NotFound,
                detail: $"Tags not found: {string.Join(", ", tnf.MissingTagIds)}."),
            _ => throw new InvalidOperationException("Unhandled outcome."),
        };
    }

    [HttpDelete("{id:guid}/tags/{tagId:guid}")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [RequirePermission("tags:write")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DetachTag(Guid id, Guid tagId, CancellationToken ct)
    {
        var outcome = await _tags.DetachAsync(id, tagId, ct);
        if (outcome is DetachTagOutcome.Success && TryGetUserId(out var userId))
        {
            await _account.LogAsync(userId, "detach_tag", target: $"{id}:{tagId}", ipAddress: Ip, ct);
        }
        return outcome switch
        {
            DetachTagOutcome.Success => NoContent(),
            DetachTagOutcome.NotAttached => Problem(
                type: ErrorTypes.TagNotFound,
                title: "Tag not attached",
                statusCode: StatusCodes.Status404NotFound,
                detail: $"Tag {tagId} is not attached to document {id}."),
            _ => throw new InvalidOperationException("Unhandled outcome."),
        };
    }
}
