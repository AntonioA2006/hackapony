import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="Requiere PostgreSQL/PostGIS migrado y RUN_DB_TESTS=1",
)


@pytest.fixture
def client():
    return TestClient(app)


def test_register_and_create_report(client):
    email = f"pytest-{uuid.uuid4().hex[:12]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Pytest123!",
            "display_name": "Pytest",
            "accept_terms": True,
        },
    )
    assert reg.status_code == 201, reg.text
    token = reg.json()["tokens"]["access_token"]
    rep = client.post(
        "/api/v1/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Fuga de prueba integración",
            "description": "Descripción suficientemente larga para validar",
            "category": "leak_public_road",
            "severity": "high",
            "latitude": 19.4326,
            "longitude": -99.1332,
            "device_latitude": 19.4326,
            "device_longitude": -99.1332,
        },
    )
    assert rep.status_code == 201, rep.text
    assert rep.json()["public_id"].startswith("AA-")