from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_db
from core.services import ingest as ingest_service

router = APIRouter(prefix="/ingest", tags=["ingest"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.post("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def trigger_ingest(document_id: UUID, db: DbDep) -> None:
    try:
        await ingest_service.ingest(db, document_id)
    except ingest_service.DocumentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
