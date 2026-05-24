from fastapi import FastAPI

from core.config import settings

app = FastAPI(title="document-research core", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.app_env}
