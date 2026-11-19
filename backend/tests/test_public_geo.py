"""Política de coordenadas públicas y validación de bbox (D5). No requieren PostGIS."""

import math
import uuid

import pytest

from app.services.spatial import distance_m
from app.services.public_geo import (
    BBOX_MAX_LAT_SPAN,
    BBOX_MAX_LON_SPAN,
    GRID_DEG,
    PUBLIC_PAGE_SIZE_MAX,
    BBoxError,
    clamp_public_page,
    parse_bbox,
    public_coordinates,
)

SECRET = "test-location-hmac-secret"
INCIDENT_ID = uuid.UUID("11111111-1111-4111-8111-111111111111")


def _meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat_m = (lat2 - lat1) * 111_320
    lon_m = (lon2 - lon1) * 111_320 * math.cos(math.radians((lat1 + lat2) / 2))
    return math.hypot(lat_m, lon_m)


def _distance_to_grid(value: float) -> float:
    snapped = round(value / GRID_DEG) * GRID_DEG
    return abs(value - snapped)


def test_distance_is_about_250_meters_near_mexico():
    # 250 m al norte ≈ 0.00225° de latitud
    assert distance_m(19.43, -99.13, 19.43225, -99.13) == pytest.approx(250, abs=5)


def test_bbox_valid_accepts_order_and_whitespace():
    assert parse_bbox(" -99.2, 19.3, -99.0, 19.5 ") == (-99.2, 19.3, -99.0, 19.5)


def test_bbox_accepts_national_view_and_exact_span_limit():
    assert parse_bbox("-118.6,14.4,-86.6,32.8") == (-118.6, 14.4, -86.6, 32.8)
    assert parse_bbox(f"0,0,{BBOX_MAX_LON_SPAN},{BBOX_MAX_LAT_SPAN}") == (0, 0, BBOX_MAX_LON_SPAN, BBOX_MAX_LAT_SPAN)


@pytest.mark.parametrize(
    "raw",
    [
        "no-es-bbox",
        "1,2,3",
        "1,2,3,4,5",
        "",
        "nan,0,1,1",
        "0,0,1,inf",
        "-99,19,-100,20",
        "0,20,1,19",
        "0,0,0,1",
        "0,0,1,0",
        "200,0,201,1",
        "-181,0,-180,1",
        "0,91,1,92",
        "0,-91,1,-90",
        "-180,-90,180,90",
        f"0,0,{BBOX_MAX_LON_SPAN + 0.01},1",
        f"0,0,1,{BBOX_MAX_LAT_SPAN + 0.01}",
    ],
)
def test_bbox_invalid(raw: str):
    with pytest.raises(BBoxError):
        parse_bbox(raw)


def test_public_page_is_capped():
    assert clamp_public_page(0, 0) == (1, 1)
    assert clamp_public_page(2, 10) == (2, 10)
    assert clamp_public_page(1, 999) == (1, PUBLIC_PAGE_SIZE_MAX)
    assert PUBLIC_PAGE_SIZE_MAX == 200


def test_public_coordinates_are_deterministic_rounded_and_within_one_cell():
    raw = (19.432610, -99.133210)
    first = public_coordinates(*raw, INCIDENT_ID, secret=SECRET)
    again = public_coordinates(*raw, INCIDENT_ID, secret=SECRET)
    assert first == again
    assert first != raw
    assert first[0] == round(first[0], 6)
    assert first[1] == round(first[1], 6)
    half = GRID_DEG / 2
    assert _distance_to_grid(first[0]) < half + 1e-5
    assert _distance_to_grid(first[1]) < half + 1e-5
    # Snap (hasta media celda) + jitter (hasta media celda): menos de ~45 m en México.
    assert _meters(*raw, *first) < 45


def test_public_coordinates_depend_on_secret_and_id():
    raw = (19.432610, -99.133210)
    base = public_coordinates(*raw, INCIDENT_ID, secret=SECRET)
    other_secret = public_coordinates(*raw, INCIDENT_ID, secret="otro-secreto")
    other_id = public_coordinates(*raw, uuid.UUID("22222222-2222-4222-8222-222222222222"), secret=SECRET)
    assert base != other_secret
    assert base != other_id
