using DocumentResearch.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DocumentResearch.Api.Services;

public sealed class AccountService : IAccountService
{
    private const int MaxLimit = 200;
    private readonly AppDbContext _db;
    private readonly TimeProvider _clock;

    public AccountService(AppDbContext db, TimeProvider clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ActivityEvent>> GetActivityAsync(Guid userId, int limit, CancellationToken ct)
    {
        var capped = Math.Clamp(limit, 1, MaxLimit);
        return await _db.ActivityEvents
            .AsNoTracking()
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.OccurredAt)
            .Take(capped)
            .ToListAsync(ct);
    }

    public async Task LogAsync(Guid userId, string action, string? target, string? ipAddress, CancellationToken ct)
    {
        _db.ActivityEvents.Add(new ActivityEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            Target = target,
            IpAddress = ipAddress,
            OccurredAt = _clock.GetUtcNow(),
        });
        await _db.SaveChangesAsync(ct);
    }
}
