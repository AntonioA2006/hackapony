from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://agua:agua_secret@localhost:5432/agua_alerta"
    jwt_secret: str = "dev-access-secret-change-in-production-32b"
    jwt_refresh_secret: str = "dev-refresh-secret-change-in-production-32b"
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 7
    photos_path: str = "./data/photos"
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:3080,http://localhost:8081"
    cors_origin_regex: str = (
        r"^https?://(localhost|127\.0\.0\.1"
        r"|10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
        r"|192\.168\.\d{1,3}\.\d{1,3}"
        r"|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$"
    )
    grouping_distance_m: float = 75.0
    duplicate_suggest_radius_m: float = 50.0
    priority_pop_ref: int = 5000
    log_level: str = "INFO"
    password_reset_ttl_min: int = 60
    password_reset_dev_expose_token: bool = False
    max_photo_bytes: int = 5 * 1024 * 1024
    allowed_photo_mimes: str = "image/jpeg,image/png,image/webp"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_mime_set(self) -> set[str]:
        return {m.strip() for m in self.allowed_photo_mimes.split(",")}


@lru_cache
def get_settings() -> Settings:
    return Settings()