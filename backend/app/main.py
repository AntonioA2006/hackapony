import logging
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import get_db

settings = get_settings()
logging.basicConfig(level=settings.log_level)

app = FastAPI(title="Agua Alerta API", version="0.1.0")
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

Path(settings.photos_path).mkdir(parents=True, exist_ok=True)


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
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Error interno",
                "details": [],
                "request_id": None,
            }
        },
    )


app.include_router(api_router, prefix="/api/v1")