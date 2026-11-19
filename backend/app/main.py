import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import SessionLocal, get_db
from app.middleware.request_id import RequestIdMiddleware

settings = get_settings()
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("agua_alerta")


def _bootstrap_superadmin() -> None:
    """Crea (o promueve) el superadministrador inicial desde BOOTSTRAP_SUPERADMIN_EMAIL; la contraseña es opcional."""
    email = (settings.bootstrap_superadmin_email or "").strip().lower()
    password = settings.bootstrap_superadmin_password or ""
    if not email:
        return
    from sqlalchemy import func, select

    from app.core.security import hash_password
    from app.domain.enums import UserRole
    from app.models.entities import User

    try:
        with SessionLocal() as db:
            existing = db.scalar(select(User).where(func.lower(User.email) == email))
            if existing:
                if existing.role != UserRole.SUPERADMINISTRADOR:
                    existing.role = UserRole.SUPERADMINISTRADOR
                    db.commit()
                    logger.info("Rol de superadministrador asignado a %s", email)
                return
            db.add(
                User(
                    email=email,
                    display_name="Superadministrador",
                    role=UserRole.SUPERADMINISTRADOR,
                    # Sin contraseña: la persona entra con Firebase usando este correo (verificado) y la cuenta se vincula
                    password_hash=hash_password(password) if password else None,
                )
            )
            db.commit()
            logger.info("Superadministrador inicial creado: %s", email)
    except SQLAlchemyError:
        logger.exception("No se pudo crear el superadministrador inicial")


@asynccontextmanager
async def lifespan(_: FastAPI):
    _bootstrap_superadmin()
    yield


app = FastAPI(title="Agua Alerta API", version="0.1.0", lifespan=lifespan)
app.add_middleware(RequestIdMiddleware)
_cors_kw: dict = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.cors_origin_regex.strip():
    _cors_kw["allow_origin_regex"] = settings.cors_origin_regex.strip()
if settings.cors_origin_list:
    _cors_kw["allow_origins"] = settings.cors_origin_list
app.add_middleware(CORSMiddleware, **_cors_kw)


@app.get("/")
def root():
    return {"service": "agua-alerta-api", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/ready")
def health_ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT PostGIS_Version();"))
        return {"status": "ready", "database": "up", "postgis": True}
    except SQLAlchemyError:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": "unavailable", "postgis": False},
        )


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.exception("Error no controlado request_id=%s %s %s", request_id, request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Error interno",
                "details": [],
                "request_id": request_id,
            }
        },
    )


app.include_router(api_router, prefix="/api/v1")