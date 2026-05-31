from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    log_level: str = "INFO"
    core_port: int = 8000

    database_url: str = "postgresql+psycopg://postgres:dev@localhost:5432/document_research"

    # JWT issued by backend/api (HS256, shared secret). Must match Auth:Jwt there.
    jwt_issuer: str = "docres-api"
    jwt_audience: str = "docres-web"
    jwt_secret: str = "dev-only-signing-key-replace-with-32-bytes-or-longer"

    # Shared secret for service-to-service calls (api -> core /ingest).
    service_token: str = "dev-only-service-token-replace-me"

    anthropic_api_key: str = ""

    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "documents"
    minio_use_ssl: bool = False


settings = Settings()
