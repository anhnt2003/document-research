import io

import pypdf
from docx import Document as DocxDocument


class UnsupportedMimeError(Exception):
    def __init__(self, mime: str) -> None:
        super().__init__(f"No extractor for MIME '{mime}'.")
        self.mime = mime


def extract_text(content: bytes, mime: str) -> str:
    match mime:
        case "text/plain" | "text/markdown":
            return content.decode("utf-8")
        case "application/pdf":
            reader = pypdf.PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() for page in reader.pages)
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            docx = DocxDocument(io.BytesIO(content))
            return "\n".join(p.text for p in docx.paragraphs)
        case _:
            raise UnsupportedMimeError(mime)
