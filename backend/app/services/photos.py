"""Saneamiento de fotografías: valida el contenido real y elimina metadatos (EXIF con GPS, dispositivo)."""
import io

from PIL import Image, ImageOps, UnidentifiedImageError

_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
MAX_SIDE_PX = 2560


class InvalidImage(ValueError):
    pass


def sanitize_image(data: bytes) -> tuple[bytes, str, str]:
    """Devuelve (bytes re-codificados sin metadatos, mime, extensión).

    Se decide el formato por el contenido, no por el Content-Type que envía el cliente.
    Re-codificar descarta EXIF/XMP; antes se aplica la orientación EXIF para no girar la foto.
    """
    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()
        img = Image.open(io.BytesIO(data))
        fmt = img.format
        img.load()
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise InvalidImage("El archivo no es una imagen válida") from exc
    if fmt not in _FORMATS:
        raise InvalidImage("Formato no permitido (JPEG, PNG o WebP)")

    img = ImageOps.exif_transpose(img)
    img.thumbnail((MAX_SIDE_PX, MAX_SIDE_PX))
    out = io.BytesIO()
    if fmt == "JPEG":
        img.convert("RGB").save(out, "JPEG", quality=85, optimize=True)
    elif fmt == "PNG":
        img.save(out, "PNG", optimize=True)
    else:
        img.save(out, "WEBP", quality=85)
    ext = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}[fmt]
    return out.getvalue(), _FORMATS[fmt], ext
