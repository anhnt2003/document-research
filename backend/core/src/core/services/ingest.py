from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core import extraction, storage
from core.models import Document


class DocumentNotFoundError(Exception):
    def __init__(self, document_id: UUID) -> None:
        super().__init__(f"Document {document_id} not found.")
        self.document_id = document_id


async def ingest(db: AsyncSession, document_id: UUID) -> None:
    document = await db.get(Document, document_id)
    if document is None:
        raise DocumentNotFoundError(document_id)
    if document.storage_key is None or document.mime_type is None:
        document.ingestion_status = "Failed"
        document.ingestion_error = "Document has no storage_key or mime_type."
        await db.commit()
        return

    document.ingestion_status = "Extracting"
    await db.commit()

    try:
        content = await storage.get_object(document.storage_key)
        text = extraction.extract_text(content, document.mime_type)
    except Exception as e:
        document.ingestion_status = "Failed"
        document.ingestion_error = str(e)
        await db.commit()
        return

    document.body = text
    document.ingestion_status = "Ready"
    document.ingestion_error = None
    await db.commit()
