using DocumentResearch.Api.Contracts.Documents;

namespace DocumentResearch.Api.Services;

public abstract record CreateTagOutcome
{
    public sealed record Success(TagDto Tag) : CreateTagOutcome;
    public sealed record InvalidColor(string Color) : CreateTagOutcome;
    public sealed record DuplicateLabel(string Label, Guid? ParentId) : CreateTagOutcome;
    public sealed record ParentNotFound(Guid ParentId) : CreateTagOutcome;
}

public abstract record UpdateTagOutcome
{
    public sealed record Success(TagDto Tag) : UpdateTagOutcome;
    public sealed record TagNotFound : UpdateTagOutcome;
    public sealed record InvalidColor(string Color) : UpdateTagOutcome;
    public sealed record ParentNotFound(Guid ParentId) : UpdateTagOutcome;
    public sealed record Cycle : UpdateTagOutcome;
    public sealed record DuplicateLabel(string Label, Guid? ParentId) : UpdateTagOutcome;
}

public abstract record DeleteTagOutcome
{
    public sealed record Success : DeleteTagOutcome;
    public sealed record TagNotFound : DeleteTagOutcome;
    public sealed record HasChildren : DeleteTagOutcome;
}

public abstract record AttachTagsOutcome
{
    public sealed record Success : AttachTagsOutcome;
    public sealed record DocumentNotFound : AttachTagsOutcome;
    public sealed record TagsNotFound(IReadOnlyList<Guid> MissingTagIds) : AttachTagsOutcome;
}

public abstract record DetachTagOutcome
{
    public sealed record Success : DetachTagOutcome;
    public sealed record NotAttached : DetachTagOutcome;
}
