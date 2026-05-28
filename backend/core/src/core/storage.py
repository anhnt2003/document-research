import asyncio

from minio import Minio
from minio.error import S3Error

from core.config import settings


class FileNotFoundInStorageError(Exception):
    def __init__(self, key: str) -> None:
        super().__init__(f"Object with key '{key}' not found in storage.")
        self.key = key


def _client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_use_ssl,
    )


async def get_object(key: str) -> bytes:
    def _read() -> bytes:
        client = _client()
        try:
            response = client.get_object(settings.minio_bucket, key)
        except S3Error as e:
            if e.code == "NoSuchKey":
                raise FileNotFoundInStorageError(key) from e
            raise
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    return await asyncio.to_thread(_read)
