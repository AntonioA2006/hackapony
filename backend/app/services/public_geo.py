"""Ubicación pública y bbox del mapa (D5).

La API pública no devuelve el punto exacto del reporte. Cada incidencia guarda
`public_location`, calculada una sola vez al crear o mover el centroide:

1. Snap a una malla de ``GRID_DEG`` grados (~30 m de latitud).
2. Desplazamiento determinista dentro de la celda, derivado de
   HMAC-SHA256(LOCATION_HMAC_SECRET, id). No es aleatorio por request: promediar
   consultas no recupera el punto real, y sin el secreto no se puede restar el
   offset para volver al centro de la celda.

El filtro ``bbox`` usa esa columna (índice GiST), no el centroide. Encoger el
rectángulo solo resuelve la ubicación publicada.

El rectángulo que envía el mapa está recortado a la zona de operación
(``frontend/src/shared/map/viewportBbox.ts``), más chico que
``BBOX_MAX_LON_SPAN`` / ``BBOX_MAX_LAT_SPAN``. Si se agranda el mapa, hay que
subir estos techos o el viewport nacional responderá 422.
"""

from __future__ import annotations

import hashlib
import hmac
import math
import uuid

from app.core.config import get_settings

# ~30 m de latitud (1° ≈ 111_320 m). En México la longitud equivalente es un poco menor.
GRID_DEG = 0.00027
_HALF_CELL = GRID_DEG / 2

# El mapa nacional cabe (~32° × 18°). Estos techos rechazan un barrido continental
# y siguen aceptando la vista inicial, también en un teléfono con zoom bajo.
BBOX_MAX_LON_SPAN = 50.0
BBOX_MAX_LAT_SPAN = 40.0

PUBLIC_PAGE_SIZE_DEFAULT = 100
PUBLIC_PAGE_SIZE_MAX = 200


class BBoxError(ValueError):
    """bbox rechazado. El mensaje es el que ve el cliente."""


def clamp_public_page(page: int, page_size: int) -> tuple[int, int]:
    if page < 1:
        page = 1
    page_size = min(max(page_size, 1), PUBLIC_PAGE_SIZE_MAX)
    return page, page_size


def parse_bbox(raw: str) -> tuple[float, float, float, float]:
    """Devuelve (min_lon, min_lat, max_lon, max_lat)."""
    if len(raw) > 200:
        raise BBoxError("bbox debe ser minLon,minLat,maxLon,maxLat")
    parts = [p.strip() for p in raw.split(",")]
    if len(parts) != 4 or any(not p for p in parts):
        raise BBoxError("bbox debe ser minLon,minLat,maxLon,maxLat")
    try:
        min_lon, min_lat, max_lon, max_lat = (float(p) for p in parts)
    except ValueError as exc:
        raise BBoxError("bbox debe ser minLon,minLat,maxLon,maxLat") from exc
    values = (min_lon, min_lat, max_lon, max_lat)
    if not all(math.isfinite(v) for v in values):
        raise BBoxError("bbox debe contener números finitos")
    if not (-180.0 <= min_lon <= 180.0 and -180.0 <= max_lon <= 180.0):
        raise BBoxError("la longitud debe estar entre -180 y 180")
    if not (-90.0 <= min_lat <= 90.0 and -90.0 <= max_lat <= 90.0):
        raise BBoxError("la latitud debe estar entre -90 y 90")
    if min_lon >= max_lon or min_lat >= max_lat:
        raise BBoxError("bbox inválido: se requiere minLon < maxLon y minLat < maxLat")
    if (max_lon - min_lon) > BBOX_MAX_LON_SPAN or (max_lat - min_lat) > BBOX_MAX_LAT_SPAN:
        raise BBoxError(
            f"bbox demasiado grande (máximo {BBOX_MAX_LON_SPAN:g}° de longitud "
            f"y {BBOX_MAX_LAT_SPAN:g}° de latitud)"
        )
    return min_lon, min_lat, max_lon, max_lat


def _unit_offset(chunk: bytes) -> float:
    """Mapea 8 bytes a [-0.5, 0.5). Nunca llega a +0.5, así el jitter no sale de la celda."""
    span = 1 << 64
    return (int.from_bytes(chunk, "big") / span) - 0.5


def public_coordinates(
    lat: float,
    lon: float,
    incident_id: uuid.UUID | str,
    *,
    secret: str | None = None,
) -> tuple[float, float]:
    """Punto que se puede publicar. Redondeado a 6 decimales (~0.1 m)."""
    key = secret if secret is not None else get_settings().location_hmac_secret
    digest = hmac.new(key.encode(), str(incident_id).encode(), hashlib.sha256).digest()
    lat_j = _unit_offset(digest[0:8]) * _HALF_CELL
    lon_j = _unit_offset(digest[8:16]) * _HALF_CELL
    pub_lat = round(round(lat / GRID_DEG) * GRID_DEG + lat_j, 6)
    pub_lon = round(round(lon / GRID_DEG) * GRID_DEG + lon_j, 6)
    pub_lat = min(90.0, max(-90.0, pub_lat))
    pub_lon = min(180.0, max(-180.0, pub_lon))
    return pub_lat, pub_lon
