"""Adaptador HTTP del saneador de fotos (API usada por el equipo).

La lógica vive en `app.services.photos.sanitize_image` (una sola implementación):
valida el contenido real con Pillow, aplica la orientación EXIF, limita la resolución
y re-codifica sin metadatos (EXIF/GPS).
"""
from fastapi import HTTPException

from app.services.photos import InvalidImage, sanitize_image


def sanitize_photo(content: bytes, allowed_mimes: set[str]) -> tuple[bytes, str]:
    if not content:
        raise HTTPException(415, detail="Archivo vacío")
    try:
        clean, mime, _ext = sanitize_image(content)
    except InvalidImage as exc:
        raise HTTPException(415, detail=str(exc)) from exc
    if mime not in allowed_mimes:
        raise HTTPException(415, detail="Formato de imagen no permitido")
    return clean, mime
