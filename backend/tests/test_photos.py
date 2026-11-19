import io

import pytest
from PIL import Image

from app.services.photos import InvalidImage, sanitize_image


def _jpeg_with_gps() -> bytes:
    img = Image.new("RGB", (64, 48), (120, 160, 200))
    exif = Image.Exif()
    exif[0x010F] = "MarcaTelefono"  # Make
    exif[0x8825] = {2: (19.0, 25.0, 57.0), 4: (99.0, 7.0, 59.0)}  # GPSInfo
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif)
    return buf.getvalue()


def test_strips_exif_and_keeps_format():
    raw = _jpeg_with_gps()
    assert Image.open(io.BytesIO(raw)).getexif()  # la entrada sí trae EXIF
    clean, mime, ext = sanitize_image(raw)
    assert (mime, ext) == ("image/jpeg", ".jpg")
    out = Image.open(io.BytesIO(clean))
    assert out.size == (64, 48)
    assert not out.getexif()


def test_rejects_non_image_even_with_image_extension():
    with pytest.raises(InvalidImage):
        sanitize_image(b"<?php echo 'no soy una foto'; ?>")


def test_rejects_unsupported_format():
    buf = io.BytesIO()
    Image.new("RGB", (8, 8)).save(buf, "GIF")
    with pytest.raises(InvalidImage):
        sanitize_image(buf.getvalue())
