using DocumentResearch.Api.Contracts.Documents;
using DocumentResearch.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DocumentResearch.Api.Services;

public sealed class TagService : ITagService
{
    private readonly AppDbContext _db;
    private readonly TimeProvider _clock;

    public TagService(AppDbContext db, TimeProvider clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<IReadOnlyList<TagDto>> ListAsync(CancellationToken ct)
    {
        return await _db.Tags
            .AsNoTracking()
            .Select(t => new TagDto(
                t.Id,
                t.Label,
                t.Color,
                t.ParentId,
                t.DocumentTags.Count))
            .ToListAsync(ct);
    }

    public async Task<CreateTagOutcome> CreateAsync(CreateTagRequest request, CancellationToken ct)
    {
        if (!TagColors.Allowed.Contains(request.Color))
        {
            return new CreateTagOutcome.InvalidColor(request.Color);
        }

        if (request.ParentId is { } parentId)
        {
            var parentExists = await _db.Tags.AnyAsync(t => t.Id == parentId, ct);
            if (!parentExists)
            {
                return new CreateTagOutcome.ParentNotFound(parentId);
            }
        }

        var labelTaken = await _db.Tags.AnyAsync(
            t => t.ParentId == request.ParentId && t.Label == request.Label, ct);
        if (labelTaken)
        {
            return new CreateTagOutcome.DuplicateLabel(request.Label, request.ParentId);
        }

        var tag = new Tag
        {
            Id = Guid.NewGuid(),
            Label = request.Label,
            Color = request.Color,
            ParentId = request.ParentId,
            CreatedAt = _clock.GetUtcNow(),
        };
        _db.Tags.Add(tag);
        await _db.SaveChangesAsync(ct);
        return new CreateTagOutcome.Success(new TagDto(tag.Id, tag.Label, tag.Color, tag.ParentId, 0));
    }

    public async Task<UpdateTagOutcome> UpdateAsync(Guid id, UpdateTagRequest request, CancellationToken ct)
    {
        if (!TagColors.Allowed.Contains(request.Color))
        {
            return new UpdateTagOutcome.InvalidColor(request.Color);
        }

        var tag = await _db.Tags.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (tag is null)
        {
            return new UpdateTagOutcome.TagNotFound();
        }

        if (request.ParentId is { } parentId)
        {
            if (parentId == id)
            {
                return new UpdateTagOutcome.Cycle();
            }
            var parent = await _db.Tags.FirstOrDefaultAsync(t => t.Id == parentId, ct);
            if (parent is null)
            {
                return new UpdateTagOutcome.ParentNotFound(parentId);
            }
            if (await WouldCreateCycleAsync(id, parentId, ct))
            {
                return new UpdateTagOutcome.Cycle();
            }
        }

        var labelTaken = await _db.Tags.AnyAsync(
            t => t.Id != id && t.ParentId == request.ParentId && t.Label == request.Label, ct);
        if (labelTaken)
        {
            return new UpdateTagOutcome.DuplicateLabel(request.Label, request.ParentId);
        }

        tag.Label = request.Label;
        tag.Color = request.Color;
        tag.ParentId = request.ParentId;
        await _db.SaveChangesAsync(ct);

        var documentCount = await _db.DocumentTags.CountAsync(dt => dt.TagId == id, ct);
        return new UpdateTagOutcome.Success(new TagDto(tag.Id, tag.Label, tag.Color, tag.ParentId, documentCount));
    }

    public async Task<DeleteTagOutcome> DeleteAsync(Guid id, CancellationToken ct)
    {
        var tag = await _db.Tags
            .Include(t => t.DocumentTags)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (tag is null)
        {
            return new DeleteTagOutcome.TagNotFound();
        }

        var hasChildren = await _db.Tags.AnyAsync(t => t.ParentId == id, ct);
        if (hasChildren)
        {
            return new DeleteTagOutcome.HasChildren();
        }

        _db.DocumentTags.RemoveRange(tag.DocumentTags);
        _db.Tags.Remove(tag);
        await _db.SaveChangesAsync(ct);
        return new DeleteTagOutcome.Success();
    }

    public async Task<IReadOnlyList<TagDto>?> ListForDocumentAsync(Guid documentId, CancellationToken ct)
    {
        var documentExists = await _db.Documents.AnyAsync(d => d.Id == documentId, ct);
        if (!documentExists)
        {
            return null;
        }

        return await _db.DocumentTags
            .AsNoTracking()
            .Where(dt => dt.DocumentId == documentId)
            .Select(dt => new TagDto(
                dt.Tag.Id,
                dt.Tag.Label,
                dt.Tag.Color,
                dt.Tag.ParentId,
                dt.Tag.DocumentTags.Count))
            .ToListAsync(ct);
    }

    public async Task<AttachTagsOutcome> AttachAsync(Guid documentId, IReadOnlyList<Guid> tagIds, CancellationToken ct)
    {
        var documentExists = await _db.Documents.AnyAsync(d => d.Id == documentId, ct);
        if (!documentExists)
        {
            return new AttachTagsOutcome.DocumentNotFound();
        }

        var distinctIds = tagIds.Distinct().ToList();
        if (distinctIds.Count == 0)
        {
            return new AttachTagsOutcome.Success();
        }

        var foundTagIds = await _db.Tags
            .Where(t => distinctIds.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(ct);
        var missing = distinctIds.Except(foundTagIds).ToList();
        if (missing.Count > 0)
        {
            return new AttachTagsOutcome.TagsNotFound(missing);
        }

        var alreadyAttached = await _db.DocumentTags
            .Where(dt => dt.DocumentId == documentId && distinctIds.Contains(dt.TagId))
            .Select(dt => dt.TagId)
            .ToListAsync(ct);

        var now = _clock.GetUtcNow();
        foreach (var tagId in distinctIds.Except(alreadyAttached))
        {
            _db.DocumentTags.Add(new DocumentTag
            {
                DocumentId = documentId,
                TagId = tagId,
                AttachedAt = now,
            });
        }
        await _db.SaveChangesAsync(ct);
        return new AttachTagsOutcome.Success();
    }

    public async Task<DetachTagOutcome> DetachAsync(Guid documentId, Guid tagId, CancellationToken ct)
    {
        var attachment = await _db.DocumentTags
            .FirstOrDefaultAsync(dt => dt.DocumentId == documentId && dt.TagId == tagId, ct);
        if (attachment is null)
        {
            return new DetachTagOutcome.NotAttached();
        }
        _db.DocumentTags.Remove(attachment);
        await _db.SaveChangesAsync(ct);
        return new DetachTagOutcome.Success();
    }

    private async Task<bool> WouldCreateCycleAsync(Guid tagId, Guid candidateParentId, CancellationToken ct)
    {
        var current = candidateParentId;
        var visited = new HashSet<Guid>();
        while (true)
        {
            if (current == tagId) return true;
            if (!visited.Add(current)) return true; // safety against existing cycle data
            var parent = await _db.Tags
                .AsNoTracking()
                .Where(t => t.Id == current)
                .Select(t => t.ParentId)
                .FirstOrDefaultAsync(ct);
            if (parent is null) return false;
            current = parent.Value;
        }
    }
}
