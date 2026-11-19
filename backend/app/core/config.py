from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://agua:agua_secret@localhost:5432/agua_alerta"
    jwt_secret: str = "dev-access-secret-change-in-production-32b"
    jwt_refresh_secret: str = "dev-refresh-secret-change-in-production-32b"
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 7
    photos_path: str = "./data/photos"
    cors_origins: str = "http://localhost:5173,http://localhost:8081"
    # Regex opcional para orígenes dinámicos (p. ej. previews de Render: https://agua-alerta.*\.onrender\.com)
    cors_origin_regex: str | None = None

    # Almacenamiento de fotos: "local" (volumen) o "s3" (Supabase Storage, Cloudflare R2, MinIO…)
    storage_backend: str = "local"
    s3_endpoint_url: str | None = None
    s3_region: str = "us-east-1"
    s3_bucket: str = "report-photos"
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None

    # Crea un superadministrador al arrancar si no existe (solo se usa si ambos están definidos)
    bootstrap_superadmin_email: str | None = None
    bootstrap_superadmin_password: str | None = None
    grouping_distance_m: float = 75.0
    duplicate_suggest_radius_m: float = 50.0
    priority_pop_ref: int = 5000
    log_level: str = "INFO"
    max_photo_bytes: int = 5 * 1024 * 1024
    allowed_photo_mimes: str = "image/jpeg,image/png,image/webp"

    @field_validator("database_url")
    @classmethod
    def _use_psycopg_driver(cls, v: str) -> str:
        """Acepta las URLs tal como las entregan Supabase/Neon/Render (postgres:// o postgresql://)."""
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix):]
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_mime_set(self) -> set[str]:
        return {m.strip() for m in self.allowed_photo_mimes.split(",")}


@lru_cache
def get_settings() -> Settings:
    return Settings()