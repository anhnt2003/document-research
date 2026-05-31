from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.access import accessible_condition
from core.auth import get_current_user_id
from core.config import settings
from core.db import get_db
from core.models import Document
from core.routers.ingest import router as ingest_router

app = FastAPI(title="document-research core", version="0.1.0")
app.include_router(ingest_router)


class SearchRequest(BaseModel):
    query: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.app_env}


@app.post("/search")
async def search(
    request: SearchRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, list[dict[str, str]]]:
    query = request.query.strip()
    if not query:
        return {"results": []}

    like = f"%{query}%"
    stmt = (
        select(Document.id, Document.title)
        .where(accessible_condition(user_id))
        .where(or_(Document.title.ilike(like), Document.body.ilike(like)))
    )
    rows = (await db.execute(stmt)).all()
    return {"results": [{"id": str(row.id), "title": row.title} for row in rows]}
