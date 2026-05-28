from datetime import datetime
from uuid import UUID

from sqlalchemy import BigInteger, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "Documents"

    id: Mapped[UUID] = mapped_column("Id", primary_key=True)
    title: Mapped[str] = mapped_column("Title", Text)
    body: Mapped[str] = mapped_column("Body", Text)
    created_at: Mapped[datetime] = mapped_column("CreatedAt")
    file_name: Mapped[str | None] = mapped_column("FileName", String(512))
    mime_type: Mapped[str | None] = mapped_column("MimeType", String(128))
    size_bytes: Mapped[int | None] = mapped_column("SizeBytes", BigInteger)
    storage_key: Mapped[str | None] = mapped_column("StorageKey", String(512))
    file_hash: Mapped[str | None] = mapped_column("FileHash", String(64))
    ingestion_status: Mapped[str] = mapped_column("IngestionStatus", String(16))
    ingestion_error: Mapped[str | None] = mapped_column("IngestionError", Text)
