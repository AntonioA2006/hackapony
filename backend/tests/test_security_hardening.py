import io
import os
import uuid

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="Requiere PostgreSQL/PostGIS migrado y RUN_DB_TESTS=1",
)


@pytest.fixture
def client():
    return TestClient(app)


def _register(client: TestClient) -> str:
    email = f"sec_{uuid.uuid4().hex[:10]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "SecTest123!", "display_name": "Sec", "accept_terms": True},
    )
    assert reg.status_code == 201
    return reg.json()["tokens"]["access_token"]


def test_reporter_cannot_confirm_own_incident(client: TestClient):
    token = _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    rep = client.post(
        "/api/v1/reports",
        headers=headers,
        json={
            "title": "Fuga propia",
            "description": "Descripcion suficientemente larga para validar",
            "category": "leak_public_road",
            "severity": "medium",
            "latitude": 18.5,
            "longitude": -99.2,
        },
    )
    assert rep.status_code == 201
    incident_id = rep.json().get("incident_id")
    if not incident_id:
        pytest.skip("Reporte sin incidencia (categoria no agrupable)")
    confirm = client.post(f"/api/v1/incidents/{incident_id}/confirm", headers=headers)
    assert confirm.status_code == 400


def test_photo_upload_validates_content(client: TestClient):
    token = _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    rep = client.post(
        "/api/v1/reports",
        headers=headers,
        json={
            "title": "Con foto",
            "description": "Descripcion suficientemente larga para validar",
            "category": "other_water",
            "severity": "low",
            "latitude": 18.51,
            "longitude": -99.21,
        },
    )
    assert rep.status_code == 201
    report_id = rep.json()["id"]

    buf = io.BytesIO()
    Image.new("RGB", (8, 8), color=(255, 0, 0)).save(buf, format="PNG")
    buf.seek(0)
    ok = client.post(
        f"/api/v1/reports/{report_id}/photos",
        headers=headers,
        files={"file": ("x.png", buf, "image/png")},
    )
    assert ok.status_code == 201

    bad = client.post(
        f"/api/v1/reports/{report_id}/photos",
        headers=headers,
        files={"file": ("x.png", io.BytesIO(b"not-an-image"), "image/png")},
    )
    assert bad.status_code == 415


def test_health_includes_request_id_header(client: TestClient):
    res = client.get("/health", headers={"X-Request-Id": "test-req-123"})
    assert res.status_code == 200
    assert res.headers.get("X-Request-Id") == "test-req-123"