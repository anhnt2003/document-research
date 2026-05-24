# backend/api (.NET 10)

CRUD API + **owner của Postgres schema**. Đọc `../../CLAUDE.md` trước nếu mới vào.

## Stack

- .NET **10** SDK (10.0.107 qua brew formula `dotnet`)
- ASP.NET Core Web API với controllers (không Minimal APIs)
- EF Core 10 + `Npgsql.EntityFrameworkCore.PostgreSQL`
- `Pgvector.EntityFrameworkCore` cho vector column
- Test: xUnit (`DocumentResearch.Api.Tests`)
- Solution file: `DocumentResearch.slnx` (định dạng XML mới của .NET 10, không phải `.sln`)

## Commands

```bash
dotnet build                                     # build cả solution
dotnet test                                      # chạy xUnit tests
dotnet run --project DocumentResearch.Api        # dev server
dotnet ef migrations add <Name> --project DocumentResearch.Api  # tạo migration
dotnet ef database update --project DocumentResearch.Api        # apply migration
dotnet format                                    # auto-format
```

EF Core CLI: nếu chưa có, cài qua `dotnet tool install -g dotnet-ef`.

## Schema ownership

**Service này là single owner của Postgres schema.** Mọi `CREATE TABLE`, `ALTER`, `CREATE INDEX` phải đi qua EF Core migration ở đây. `backend/core/` chỉ đọc/ghi data, không định nghĩa schema.

Khi thêm bảng / cột mới:

1. Update entity class
2. `dotnet ef migrations add <Name>`
3. Review migration file
4. `dotnet ef database update`
5. Báo `backend/core` team (nếu tách) cập nhật SQLAlchemy model tương ứng

## Code style

- Nullable reference types: ON (default cho .NET 10)
- Async/await trên controller actions + EF queries
- Dùng `IConfiguration` / `IOptions<T>` để đọc env, không `Environment.GetEnvironmentVariable` trực tiếp ngoại trừ trong `Program.cs`

## Gotcha

- Khi `dotnet add package` cho EF-related → pin `Microsoft.EntityFrameworkCore` về version mới nhất tránh conflict version (đã có trải nghiệm: `Pgvector.EntityFrameworkCore` kéo EFCore cũ hơn Npgsql).
- `--use-controllers` template tạo example `WeatherForecastController` — nhớ xoá khi viết controller đầu tiên thật.
