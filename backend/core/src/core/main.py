from fastapi import FastAPI
from pydantic import BaseModel

from core.config import settings

app = FastAPI(title="document-research core", version="0.1.0")


class SearchRequest(BaseModel):
    query: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.app_env}


@app.post("/search")
def search(request: SearchRequest) -> dict[str, list[dict[str, str]]]:
    if not request.query.strip():
        return {"results": []}
    return {"results": [{"id": "1", "title": "RFC 7231"}]}
