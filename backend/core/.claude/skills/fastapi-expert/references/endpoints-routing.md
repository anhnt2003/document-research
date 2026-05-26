# Endpoints & routing in `backend/core`

This service is small today (`src/core/main.py` mounts a single health route) and will grow into routers per domain (search, documents, llm, …). The patterns below keep that growth tidy.

## Folder layout

Once you add more than one router, organize like this:

```
src/core/
├── main.py                # builds FastAPI app, includes routers
├── config.py              # Pydantic Settings
├── db.py                  # engine + sessionmaker + get_db
├── deps.py                # shared Annotated dependency aliases
├── models/                # SQLAlchemy mapped classes (mirror EF Core)
├── schemas/               # Pydantic V2 request/response models
├── services/              # business logic, takes AsyncSession as arg
└── routers/
    ├── search.py
    ├── documents.py
    └── llm.py
```

Each router exports one `router = APIRouter(prefix=..., tags=[...])`. `main.py` does `app.include_router(...)` for each.

## App factory + lifespan

Resources that need startup/teardown (HTTP client, Anthropic client, engine warmup) belong in a lifespan, not module globals:

```python
# src/core/main.py
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from anthropic import AsyncAnthropic
from fastapi import FastAPI
from httpx import AsyncClient

from core.config import settings
from core.routers import search


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.http = AsyncClient(timeout=30.0)
    app.state.anthropic = AsyncAnthropic(api_key=settings.anthropic_api_key)
    try:
        yield
    finally:
        await app.state.http.aclose()
        await app.state.anthropic.close()


app = FastAPI(title="document-research core", version="0.1.0", lifespan=lifespan)
app.include_router(search.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.app_env}
```

`app.state.*` is mutable bag for app-scoped resources. Read them in dependencies, not directly in handlers, so they remain swappable in tests.

## Dependencies

Define `Annotated` aliases once in `deps.py`, reuse everywhere:

```python
# src/core/deps.py
from typing import Annotated

from anthropic import AsyncAnthropic
from fastapi import Depends, Request
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_db


def get_http(request: Request) -> AsyncClient:
    return request.app.state.http


def get_anthropic(request: Request) -> AsyncAnthropic:
    return request.app.state.anthropic


DbDep = Annotated[AsyncSession, Depends(get_db)]
HttpDep = Annotated[AsyncClient, Depends(get_http)]
LlmDep = Annotated[AsyncAnthropic, Depends(get_anthropic)]
```

In the router:

```python
from fastapi import APIRouter, status

from core.deps import DbDep, LlmDep
from core.schemas.search import SearchQuery, SearchResult
from core.services import search as search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.post(
    "",
    response_model=SearchResult,
    status_code=status.HTTP_200_OK,
    responses={400: {"description": "Invalid query"}},
)
async def run_search(payload: SearchQuery, db: DbDep, llm: LlmDep) -> SearchResult:
    return await search_service.run(db, llm, payload)
```

## Status codes — pick deliberately

| Method | Default | When to override |
| --- | --- | --- |
| GET | 200 | 204 if you genuinely return no body |
| POST | 200 | 201 when creating a resource, 202 when accepted-for-async |
| PUT/PATCH | 200 | 204 if no body returned |
| DELETE | 200 | 204 (most common) |

Set on the decorator: `@router.post(..., status_code=status.HTTP_201_CREATED)`. Don't return a custom `Response` just to change the code.

## Error handling

Two layers:

1. **`HTTPException`** for expected, user-facing failures with a known code. Be specific:
   ```python
   raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
   ```

2. **Custom exception + handler** for repeated patterns. Define an exception in `services/`, attach a handler in `main.py`:
   ```python
   class DocumentNotFound(Exception):
       def __init__(self, doc_id: int) -> None:
           self.doc_id = doc_id

   @app.exception_handler(DocumentNotFound)
   async def _not_found(_: Request, exc: DocumentNotFound) -> JSONResponse:
       return JSONResponse({"detail": f"document {exc.doc_id} not found"}, status_code=404)
   ```
   The benefit: services raise a domain-meaningful exception, routers don't repeat HTTP plumbing.

Never return `{"error": "..."}` body manually with a 200 status — that breaks every client.

## Background tasks vs. real workers

`BackgroundTasks` is for *cheap, fire-and-forget* work that happens after the response is sent (audit log, send-an-email-style stuff):

```python
from fastapi import BackgroundTasks


@router.post("/documents/{doc_id}/reindex", status_code=202)
async def reindex(doc_id: int, tasks: BackgroundTasks, db: DbDep) -> dict[str, str]:
    tasks.add_task(_reindex, db, doc_id)
    return {"status": "accepted"}
```

It's **not** a job queue — tasks run in the same process and die if it does. For heavy/long work (full corpus embedding), the user should add a proper worker; flag that rather than papering over with `BackgroundTasks`.

## WebSockets (if/when we add streaming)

```python
from fastapi import WebSocket


@router.websocket("/stream")
async def stream(ws: WebSocket) -> None:
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_text()
            await ws.send_text(msg.upper())
    except WebSocketDisconnect:
        return
```

Wrap I/O in try/except so a disconnect doesn't bubble up as a 500. Don't share an `AsyncSession` across the whole socket lifetime — open one per message or per logical operation.

## CORS

If/when the Angular frontend calls this service directly, add CORS via middleware, driven by settings — don't hardcode origins:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,   # add field to Settings, default []
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

In production, `allow_origins=["*"]` together with `allow_credentials=True` is silently rejected by browsers — use an explicit list.

## Common mistakes to refuse

- Reading `os.environ` inside a handler — go through `settings`.
- Creating an `AsyncSession` directly in a handler instead of `Depends(get_db)`.
- Using `@app.get(...)` on the bare app for everything — break into routers as soon as you have two endpoints in the same domain.
- Returning `Response(content=..., media_type="application/json")` hand-rolled when `response_model` + a typed return would do it for free.
- Catching `Exception` broadly in a handler to "make tests pass" — fix the root cause and let unexpected errors hit FastAPI's default 500 handler.
