from io import BytesIO

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError

_FORMAT_TO_MIME = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


def sanitize_photo(content: bytes, allowed_mimes: set[str]) -> tuple[bytes, str]:
    """Valida magic bytes con Pillow, elimina EXIF y devuelve bytes re-codificados."""
    if not content:
        raise HTTPException(415, detail="Archivo vacío")
    try:
        with Image.open(BytesIO(content)) as probe:
            fmt = (probe.format or "").upper()
    except UnidentifiedImageError as exc:
        raise HTTPException(415, detail="Imagen no reconocida") from exc

    mime = _FORMAT_TO_MIME.get(fmt)
    if mime is None or mime not in allowed_mimes:
        raise HTTPException(415, detail="Formato de imagen no permitido")

    try:
        with Image.open(BytesIO(content)) as img:
            if fmt == "JPEG" and img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            out = BytesIO()
            save_kw: dict = {}
            if fmt == "JPEG":
                save_kw = {"quality": 88, "optimize": True}
            elif fmt == "WEBP":
                save_kw = {"quality": 85, "method": 4}
            img.save(out, format=fmt, **save_kw)
            return out.getvalue(), mime
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(415, detail="No se pudo procesar la imagen") from exc