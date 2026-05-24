# document-research

Đồ án tốt nghiệp: web app search dữ liệu nhanh, tích hợp LLM.

## Stack

| Phần            | Công nghệ                | Vai trò                                       |
| --------------- | ------------------------ | --------------------------------------------- |
| `backend/core/` | Python 3.11 + FastAPI    | LLM, embedding, semantic search               |
| `backend/api/`  | .NET 10 + EF Core        | API CRUD nghiệp vụ, **owner của DB schema**   |
| `frontend/`     | Angular (latest)         | UI                                            |
| DB              | Postgres 16 + pgvector   | Structured + full-text + vector search        |

## Quick start

```bash
# 1. Start DB (cần OrbStack hoặc Docker đang chạy)
cp .env.example .env
docker compose up -d

# 2. Mỗi sub-project có README/CLAUDE.md riêng — xem ở:
#    backend/core/  backend/api/  frontend/
```

## Cấu trúc

```text
document-research/
├── backend/
│   ├── core/         # Python FastAPI — LLM & search
│   └── api/          # .NET — CRUD, DB schema owner
├── frontend/         # Angular
├── docs/              # Output (báo cáo .docx) + tài liệu kiến trúc cho dev
├── scripts/
│   └── db-init/       # SQL init chạy khi Postgres container tạo lần đầu
├── .claude/
│   ├── settings.json  # Permission allowlist cho Claude Code
│   └── skills/
│       └── thesis-report/  # Skill sinh báo cáo .docx theo template trường
├── docker-compose.yml
└── CLAUDE.md         # Hướng dẫn cho Claude Code (root)
```
