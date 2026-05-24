# document-research

Polyglot monorepo cho đồ án tốt nghiệp — web search + LLM. Mỗi sub-project có CLAUDE.md riêng:

- `backend/core/` — Python FastAPI (LLM, semantic search)
- `backend/api/` — .NET 10 (CRUD, **DB schema owner**)
- `frontend/web/` — Angular

Xem thêm `@README.md` để hiểu kiến trúc tổng.

## Critical gotcha: DB schema ownership

**Chỉ `backend/api/` được phép migrate/tạo schema Postgres.** `backend/core/` chỉ đọc/ghi data trên schema đã tồn tại, không tạo bảng. Lý do: tránh hai service tự sinh migration song song gây conflict.

Khi bạn cần thêm bảng / column / index → làm ở `backend/api/` bằng EF Core migration, không sinh `CREATE TABLE` từ `backend/core/`.

## Start DB

```bash
cp .env.example .env   # nếu chưa có
docker compose up -d   # cần OrbStack chạy
docker compose ps      # kiểm tra healthcheck
```

`pgvector` extension được tạo tự động bởi `scripts/db-init/00-pgvector.sql` khi container chạy lần đầu.

## Repo etiquette

- Branch: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`
- Commit ngắn, tiếng Việt hoặc tiếng Anh đều OK; không dùng emoji
- Không commit `docs/report.docx` (đã `.gitignore`)
- Không commit `.env`

## Báo cáo đồ án (.docx)

Tất cả nội dung báo cáo .docx được sinh qua skill `thesis-report` (`.claude/skills/thesis-report/`) — skill này tự auto-trigger khi user nói về "báo cáo", "đồ án", "chương N", v.v. **Không tự viết nội dung báo cáo trực tiếp** — luôn để skill chạy pre-flight (đọc style-guide + chapter-structure) trước.

Skill đã bundle sẵn template gốc của trường (HUBT, Khoa CNTT, Khóa 27) trong `.claude/skills/thesis-report/assets/`. Đừng để các file template thesis lan ra `docs/` — `docs/` chỉ dùng cho output thực sự (master `report.docx`) và doc kiến trúc cho dev.

## Verification quick reference

| Sub-project | Verify command |
| --- | --- |
| `backend/core` | `cd backend/core && uv run pytest && uv run ruff check` |
| `backend/api` | `cd backend/api && dotnet build && dotnet test` |
| `frontend/web` | `cd frontend/web && npx ng build` |

Sau mỗi loạt thay đổi, chạy verify của sub-project tương ứng.
