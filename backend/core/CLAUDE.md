# backend/core (Python + FastAPI)

Phần LLM + semantic search của project. Đọc `../../CLAUDE.md` trước nếu mới vào.

## Stack

- Python **3.11** (yêu cầu trong `pyproject.toml`)
- Package manager: **uv** (KHÔNG dùng pip/poetry/pipenv trong project này)
- Framework: FastAPI + Uvicorn
- DB: SQLAlchemy 2.0 async + `psycopg[binary]` v3
- Vector: `pgvector` Python package (binding cho pgvector extension trong Postgres)
- LLM: Anthropic SDK

## Commands

```bash
uv run uvicorn core.main:app --reload          # dev server (port 8000 mặc định)
uv run pytest                                   # tests
uv run ruff check .                             # lint
uv run ruff format .                            # auto-fix style
uv run mypy src                                 # type check (strict mode)
uv add <pkg>                                    # add runtime dep
uv add --dev <pkg>                              # add dev dep
```

Chạy lint + test trước khi commit. Mypy strict đã bật → giữ type annotation đầy đủ.

## Code style

- **Async/await everywhere** trên I/O path (DB, HTTP, LLM call). Không dùng sync SQLAlchemy session / requests / psycopg2 sync driver.
- Pydantic Settings (`src/core/config.py`) — đừng đọc `os.environ` trực tiếp ở chỗ khác.
- Import absolute từ `core.*` (đã setup pythonpath trong pyproject).

## Gotcha quan trọng

- **KHÔNG migrate / tạo schema** từ đây. `backend/api/` (EF Core) là owner. Nếu cần bảng mới → bảo user chạy migration ở `backend/api/`.
- `pgvector` extension được Postgres container tự bật qua `scripts/db-init/00-pgvector.sql`. Nếu DB không có extension → kiểm tra container đã restart sau init script chưa.
- LLM API key đọc từ `ANTHROPIC_API_KEY` env — không hardcode.
