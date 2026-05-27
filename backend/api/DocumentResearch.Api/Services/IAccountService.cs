using DocumentResearch.Api.Data;

namespace DocumentResearch.Api.Services;

public interface IAccountService
{
    Task<IReadOnlyList<ActivityEvent>> GetActivityAsync(Guid userId, int limit, CancellationToken ct);

    Task LogAsync(Guid userId, string action, string? target, string? ipAddress, CancellationToken ct);
}
