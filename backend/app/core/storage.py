"""Almacenamiento de fotografías detrás de una interfaz común (ver arquitectura §8.4).

- LocalStorage: volumen en disco (desarrollo, Docker Compose).
- S3Storage: cualquier servicio compatible con S3 (Supabase Storage, Cloudflare R2, MinIO).
"""
from functools import lru_cache
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings


class BlobStorage(Protocol):
    def put(self, key: str, data: bytes, content_type: str) -> None: ...
    def get(self, key: str) -> bytes | None: ...


class LocalStorage:
    def __init__(self, root: str) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root.resolve() not in path.parents:
            raise ValueError("storage key fuera del directorio raíz")
        return path

    def put(self, key: str, data: bytes, content_type: str) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def get(self, key: str) -> bytes | None:
        path = self._path(key)
        return path.read_bytes() if path.is_file() else None


class S3Storage:
    def __init__(self, *, endpoint_url: str | None, region: str, bucket: str, key_id: str, secret: str) -> None:
        import boto3
        from botocore.config import Config

        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            region_name=region,
            aws_access_key_id=key_id,
            aws_secret_access_key=secret,
            config=Config(s3={"addressing_style": "path"}, retries={"max_attempts": 3}),
        )

    def put(self, key: str, data: bytes, content_type: str) -> None:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)

    def get(self, key: str) -> bytes | None:
        from botocore.exceptions import ClientError

        try:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
                return None
            raise


@lru_cache
def get_storage() -> BlobStorage:
    s = get_settings()
    if s.storage_backend == "s3":
        if not (s.s3_access_key_id and s.s3_secret_access_key):
            raise RuntimeError("STORAGE_BACKEND=s3 requiere S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY")
        return S3Storage(
            endpoint_url=s.s3_endpoint_url,
            region=s.s3_region,
            bucket=s.s3_bucket,
            key_id=s.s3_access_key_id,
            secret=s.s3_secret_access_key,
        )
    return LocalStorage(s.photos_path)
