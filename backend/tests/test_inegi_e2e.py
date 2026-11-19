"""Smoke E2E contra wscatgeo INEGI (red real)."""
import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_INGEI_E2E") != "1",
    reason="Requiere red a gaia.inegi.org.mx y RUN_INGEI_E2E=1",
)

CVE_ENT = "09"
CVE_MUN = "002"
SUPER_EMAIL = "super@example.com"
SUPER_PASSWORD = "Super12345!"


@pytest.fixture
def client():
    return TestClient(app)


def _super_token(client: TestClient) -> str:
    res = client.post("/api/v1/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASSWORD})
    assert res.status_code == 200, res.text
    return res.json()["tokens"]["access_token"]


def test_inegi_import_relink_and_territorial_context(client: TestClient):
    token = _super_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    mun = client.post(f"/api/v1/inegi/import/wscatgeo/{CVE_ENT}/municipalities", headers=headers)
    assert mun.status_code == 200, mun.text
    assert mun.json()["rows_upserted"] > 0

    ageb = client.post(f"/api/v1/inegi/import/wscatgeo/{CVE_ENT}/{CVE_MUN}/ageb", headers=headers)
    assert ageb.status_code == 200, ageb.text
    assert ageb.json()["rows_upserted"] > 0

    relink = client.post("/api/v1/inegi/relink-territorial", headers=headers)
    assert relink.status_code == 200, relink.text

    census = client.get(f"/api/v1/census-areas?cve_ent={CVE_ENT}&cve_mun={CVE_MUN}&page_size=5", headers=headers)
    assert census.status_code == 200
    assert len(census.json()) > 0

    email = f"inegi_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "InegiE2e123!",
            "display_name": "INEGI E2E",
            "accept_terms": True,
        },
    )
    assert reg.status_code == 201
    user_token = reg.json()["tokens"]["access_token"]

    report = client.post(
        "/api/v1/reports",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "title": "Fuga INEGI E2E",
            "description": "Reporte para validar contexto territorial tras import AGEB.",
            "category": "leak_public_road",
            "severity": "high",
            "latitude": 19.4326,
            "longitude": -99.1332,
            "device_latitude": 19.4326,
            "device_longitude": -99.1332,
        },
    )
    assert report.status_code == 201, report.text
    report_id = report.json()["id"]

    client.post("/api/v1/inegi/relink-territorial", headers=headers)

    from sqlalchemy import text

    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        row = db.execute(
            text("SELECT municipality_id, census_area_id FROM reports WHERE id = :id"),
            {"id": report_id},
        ).one()
        assert row.municipality_id is not None, "municipality_id debe asignarse tras import CDMX"
    finally:
        db.close()