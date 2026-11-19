"""GET /incidents/public: bbox, límite y coordenadas ofuscadas (D5). Requiere PostGIS."""

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password
from app.domain.enums import LeakSeverity, ReportCategory, ReportStatus, UserRole
from app.main import app
from app.models.entities import Incident, Report, User
from app.services.public_geo import PUBLIC_PAGE_SIZE_MAX, public_coordinates
from app.services.spatial import point_wkt

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="Requiere PostgreSQL/PostGIS migrado y RUN_DB_TESTS=1",
)

CDMX = (19.4326, -99.1332)


@pytest.fixture
def client():
    return TestClient(app)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_user(role: UserRole = UserRole.CIUDADANO) -> tuple[uuid.UUID, str]:
    with SessionLocal() as db:
        user = User(
            email=f"pub-{uuid.uuid4().hex[:12]}@example.com",
            password_hash=hash_password("Pytest123!"),
            display_name="Pytest",
            role=role,
        )
        db.add(user)
        db.commit()
        return user.id, create_access_token(str(user.id), {"role": role.value})


def _report_payload(lat: float, lon: float) -> dict:
    return {
        "title": "Fuga de prueba publica",
        "description": "Descripción suficientemente larga para validar",
        "category": "leak_public_road",
        "severity": "high",
        "latitude": lat,
        "longitude": lon,
    }


def _bbox_around(lat: float, lon: float, pad: float = 0.02) -> str:
    return f"{lon - pad},{lat - pad},{lon + pad},{lat + pad}"


def test_invalid_bbox_is_422(client):
    cases = {
        "no": "minLon,minLat,maxLon,maxLat",
        "-99,20,-100,21": "minLon < maxLon",
        "0,0,1,0": "minLat < maxLat",
        "200,0,201,1": "longitud",
        "0,100,1,101": "latitud",
        "-180,-90,180,90": "demasiado grande",
        "nan,0,1,1": "finitos",
    }
    for raw, fragment in cases.items():
        res = client.get("/api/v1/incidents/public", params={"bbox": raw})
        assert res.status_code == 422, res.text
        assert fragment in res.json()["detail"]


def test_public_map_hides_exact_point_and_filters_by_published_bbox(client):
    lat, lon = CDMX
    _, citizen = _make_user()
    _, admin = _make_user(UserRole.ADMINISTRADOR)
    created = client.post("/api/v1/reports", headers=_auth(citizen), json=_report_payload(lat, lon))
    assert created.status_code == 201, created.text
    report = created.json()
    incident_id = report["incident_id"]
    assert incident_id

    hidden = client.get("/api/v1/incidents/public", params={"bbox": _bbox_around(lat, lon)})
    assert hidden.status_code == 200, hidden.text
    assert all(item["id"] != incident_id for item in hidden.json()["items"])

    validated = client.patch(
        f"/api/v1/reports/{report['id']}",
        headers=_auth(admin),
        json={"status": "validated"},
    )
    assert validated.status_code == 200, validated.text

    listed = client.get("/api/v1/incidents/public", params={"bbox": _bbox_around(lat, lon), "page_size": 50})
    assert listed.status_code == 200, listed.text
    match = next(item for item in listed.json()["items"] if item["id"] == incident_id)
    expected = public_coordinates(report["latitude"], report["longitude"], incident_id)
    assert match["latitude"] == pytest.approx(expected[0], abs=1e-6)
    assert match["longitude"] == pytest.approx(expected[1], abs=1e-6)
    assert abs(match["latitude"] - report["latitude"]) > 1e-5 or abs(match["longitude"] - report["longitude"]) > 1e-5

    admin_view = client.get(f"/api/v1/incidents/{incident_id}", headers=_auth(admin))
    assert admin_view.status_code == 200, admin_view.text
    assert admin_view.json()["latitude"] == pytest.approx(report["latitude"], abs=1e-5)
    assert admin_view.json()["longitude"] == pytest.approx(report["longitude"], abs=1e-5)

    with SessionLocal() as db:
        db.execute(
            text(
                """
                UPDATE incidents
                SET centroid = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"lon": -105.0, "lat": 25.0, "id": incident_id},
        )
        db.commit()

    still_public = client.get("/api/v1/incidents/public", params={"bbox": _bbox_around(lat, lon)})
    assert any(item["id"] == incident_id for item in still_public.json()["items"])
    moved = client.get("/api/v1/incidents/public", params={"bbox": _bbox_around(25.0, -105.0)})
    assert all(item["id"] != incident_id for item in moved.json()["items"])

    nearby = client.get("/api/v1/reports/nearby", params={"lat": lat, "lon": lon, "radius_m": 100})
    assert nearby.status_code == 200, nearby.text
    near = next(item for item in nearby.json() if item["id"] == report["id"])
    near_expected = public_coordinates(report["latitude"], report["longitude"], report["id"])
    assert near["latitude"] == pytest.approx(near_expected[0], abs=1e-6)
    assert near["longitude"] == pytest.approx(near_expected[1], abs=1e-6)


def test_result_limit_with_and_without_bbox(client):
    base_lat, base_lon = 14.08, -92.05
    user_id, _ = _make_user()
    lowest_id = None
    with SessionLocal() as db:
        for i in range(PUBLIC_PAGE_SIZE_MAX + 5):
            incident_id = uuid.uuid4()
            lat = base_lat + (i % 15) * 0.0004
            lon = base_lon + (i // 15) * 0.0004
            pub_lat, pub_lon = public_coordinates(lat, lon, incident_id)
            public_id = f"L{i:04d}{uuid.uuid4().hex[:6]}"
            if i == PUBLIC_PAGE_SIZE_MAX + 4:
                lowest_id = public_id
            db.add(
                Incident(
                    id=incident_id,
                    public_id=public_id,
                    primary_category=ReportCategory.leak_public_road,
                    aggregated_severity=LeakSeverity.high,
                    centroid=point_wkt(lat, lon),
                    public_location=point_wkt(pub_lat, pub_lon),
                    report_count=1,
                    urgency_score=100 - i * 0.1,
                )
            )
            db.add(
                Report(
                    public_id=f"RL{i:04d}{uuid.uuid4().hex[:4]}",
                    user_id=user_id,
                    incident_id=incident_id,
                    title="Fuga de prueba limite",
                    description="Descripcion suficientemente larga",
                    category=ReportCategory.leak_public_road,
                    severity=LeakSeverity.high,
                    location=point_wkt(lat, lon),
                    status=ReportStatus.validated,
                )
            )
        db.commit()

    bbox = f"{base_lon - 0.05},{base_lat - 0.05},{base_lon + 0.05},{base_lat + 0.05}"
    capped = client.get("/api/v1/incidents/public", params={"bbox": bbox, "page_size": 999})
    assert capped.status_code == 200, capped.text
    body = capped.json()
    assert body["page_size"] == PUBLIC_PAGE_SIZE_MAX
    assert body["total"] >= PUBLIC_PAGE_SIZE_MAX + 5
    assert len(body["items"]) == PUBLIC_PAGE_SIZE_MAX
    assert lowest_id not in {item["public_id"] for item in body["items"]}

    compat = client.get("/api/v1/incidents/public", params={"page_size": 999})
    assert compat.status_code == 200, compat.text
    assert compat.json()["page_size"] == PUBLIC_PAGE_SIZE_MAX
    assert len(compat.json()["items"]) <= PUBLIC_PAGE_SIZE_MAX


def test_public_location_gist_index_is_used_for_bbox():
    with SessionLocal() as db:
        indexdef = db.execute(
            text("SELECT indexdef FROM pg_indexes WHERE indexname = 'incidents_public_location_gix'")
        ).scalar_one()
        assert "gist" in indexdef.lower()
        db.execute(text("SET enable_seqscan = off"))
        try:
            plan = "\n".join(
                db.execute(
                    text(
                        """
                        EXPLAIN SELECT id FROM incidents
                        WHERE public_location && ST_MakeEnvelope(-99.2, 19.3, -99.0, 19.5, 4326)::geography
                        """
                    )
                ).scalars()
            )
        finally:
            db.execute(text("SET enable_seqscan = on"))
        assert "incidents_public_location_gix" in plan
