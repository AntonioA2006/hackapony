"""Roles (ciudadano, técnico, supervisión), panel de métricas y mapa del personal (requieren PostGIS)."""
import io
import os
import random
import uuid

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password
from app.domain.enums import UserRole
from app.main import app
from app.models.entities import User

pytestmark = pytest.mark.skipif(os.getenv("RUN_DB_TESTS") != "1", reason="Requiere PostGIS y RUN_DB_TESTS=1")


@pytest.fixture
def client():
    return TestClient(app)


def _user(role: UserRole) -> tuple[str, dict]:
    with SessionLocal() as db:
        u = User(
            email=f"r-{uuid.uuid4().hex[:12]}@example.com",
            password_hash=hash_password("Pytest123!"),
            display_name=f"{role.value.title()} Prueba",
            role=role,
        )
        db.add(u)
        db.commit()
        return str(u.id), {"Authorization": f"Bearer {create_access_token(str(u.id), {'role': role.value})}"}


def _report(client, headers, **over) -> dict:
    payload = {
        "title": "Fuga para roles",
        "description": "Descripción suficientemente larga",
        "category": "broken_pipe",
        "severity": "high",
        "latitude": (lat := random.uniform(19.3, 21.0)),
        "longitude": (lon := random.uniform(-102.5, -98.6)),
        "device_latitude": lat,
        "device_longitude": lon,
        "leak_flow": "chorro",
    }
    payload.update(over)
    res = client.post("/api/v1/reports", headers=headers, json=payload)
    assert res.status_code == 201, res.text
    return res.json()


def test_citizen_cannot_use_staff_endpoints(client):
    _, cit = _user(UserRole.CIUDADANO)
    for path in ("/api/v1/incidents", "/api/v1/statistics/staff-dashboard", "/api/v1/users", "/api/v1/statistics/incidents-by-region"):
        assert client.get(path, headers=cit).status_code == 403, path


def test_public_map_hides_unvalidated_from_citizens(client):
    _, cit = _user(UserRole.CIUDADANO)
    _, tech = _user(UserRole.TECNICO)
    rep = _report(client, cit)
    lat, lon = rep["latitude"], rep["longitude"]
    bbox = f"{lon - 0.02},{lat - 0.02},{lon + 0.02},{lat + 0.02}"
    public = client.get("/api/v1/incidents/public", params={"bbox": bbox}).json()["items"]
    assert all(i["id"] != rep["incident_id"] for i in public)
    assert client.get("/api/v1/incidents/map", headers=cit, params={"bbox": bbox}).status_code == 403
    staff = client.get("/api/v1/incidents/map", headers=tech, params={"bbox": bbox})
    assert staff.status_code == 200, staff.text
    mine = next(i for i in staff.json()["items"] if i["id"] == rep["incident_id"])
    assert mine["validated"] is False and mine["awaiting_validation"] is True
    assert mine["leak_flow"] == "chorro"
    assert mine["latitude"] == pytest.approx(lat, abs=1e-5)


def test_technician_flow_take_attend_resolve_but_not_dismiss(client):
    _, cit = _user(UserRole.CIUDADANO)
    tech_id, tech = _user(UserRole.TECNICO)
    other_id, other = _user(UserRole.TECNICO)
    iid = _report(client, cit)["incident_id"]

    res = client.patch(f"/api/v1/incidents/{iid}", headers=tech, json={"status": "in_progress"})
    assert res.status_code == 200, res.text
    assert res.json()["assigned_to"]["id"] == tech_id  # al atenderla, la toma

    assert client.patch(f"/api/v1/incidents/{iid}", headers=other, json={"status": "resolved"}).status_code == 403
    assert client.patch(f"/api/v1/incidents/{iid}", headers=other, json={"assign_to_me": True}).status_code == 409
    assert client.patch(f"/api/v1/incidents/{iid}", headers=tech, json={"status": "dismissed"}).status_code == 403

    res = client.patch(f"/api/v1/incidents/{iid}", headers=tech, json={"status": "resolved"})
    assert res.status_code == 200
    body = res.json()
    assert body["closed_at"] is not None
    assert body["estimated_liters"] is not None  # chorro × horas abierta
    # Reabrir es solo de supervisión
    assert client.patch(f"/api/v1/incidents/{iid}", headers=tech, json={"status": "in_progress"}).status_code == 403
    # El ciudadano ve su reporte resuelto
    mine = client.get("/api/v1/users/me/reports", headers=cit).json()["items"]
    assert any(r["status"] == "resolved" and r["incident_status"] == "resolved" for r in mine)


def test_supervisor_promotes_technician_by_id_and_assigns(client):
    sup_id, sup = _user(UserRole.SUPERADMINISTRADOR)
    cand_id, cand = _user(UserRole.CIUDADANO)
    _, cit = _user(UserRole.CIUDADANO)

    found = client.get(f"/api/v1/users?q={cand_id}", headers=sup).json()["items"]
    assert [u["id"] for u in found] == [cand_id]

    res = client.patch(f"/api/v1/users/{cand_id}/role", headers=sup, json={"role": "TECNICO"})
    assert res.status_code == 200 and res.json()["role"] == "TECNICO"
    assert client.patch(f"/api/v1/users/{sup_id}/role", headers=sup, json={"role": "CIUDADANO"}).status_code == 409
    assert client.patch(f"/api/v1/users/{cand_id}/role", headers=sup, json={"role": "SUPERADMINISTRADOR"}).status_code == 422
    assert client.patch(f"/api/v1/users/{cand_id}/role", headers=cand, json={"role": "TECNICO"}).status_code == 403

    iid = _report(client, cit)["incident_id"]
    res = client.patch(f"/api/v1/incidents/{iid}", headers=sup, json={"assigned_to_id": cand_id})
    assert res.status_code == 200 and res.json()["assigned_to"]["id"] == cand_id
    # El nuevo técnico ve la incidencia en "mis casos"
    mine = client.get("/api/v1/incidents?assigned=me&status=active", headers=cand).json()["items"]
    assert iid in [i["id"] for i in mine]
    # Asignar a un ciudadano no se permite
    assert client.patch(f"/api/v1/incidents/{iid}", headers=sup, json={"assigned_to_id": str(uuid.uuid4())}).status_code == 422


def test_staff_dashboard_and_region_colors(client):
    _, cit = _user(UserRole.CIUDADANO)
    _, tech = _user(UserRole.TECNICO)
    _report(client, cit, leak_flow="inundacion", severity="critical")
    data = client.get("/api/v1/statistics/staff-dashboard?days=30", headers=tech).json()
    t = data["totals"]
    assert t["total"] >= 1 and t["liters_open"] >= 0
    assert {"goteo", "chorro", "inundacion"} == set(data["flow_rates_lph"])
    assert any(f["key"] == "inundacion" for f in data["by_flow"])
    assert len(data["timeline"]) >= 30
    assert all(0 <= a["pct"] <= 100 for a in data["by_area"])
    regions = client.get("/api/v1/statistics/incidents-by-region", headers=tech).json()
    assert regions["level"] == "state"
    assert any(r["active"] >= 1 and r["active"] == r["critical"] + r["high"] + r["medium"] + r["low"] for r in regions["items"])


def test_staff_detail_includes_report_photos(client, tmp_path, monkeypatch):
    from app.core import storage
    from app.core.config import get_settings

    storage.get_storage.cache_clear()
    monkeypatch.setattr(get_settings(), "photos_path", str(tmp_path))
    try:
        _, cit = _user(UserRole.CIUDADANO)
        _, tech = _user(UserRole.TECNICO)
        rep = _report(client, cit)
        buf = io.BytesIO()
        Image.new("RGB", (20, 20), (1, 2, 3)).save(buf, "JPEG")
        assert client.post(f"/api/v1/reports/{rep['id']}/photos", headers=cit, files={"file": ("a.jpg", buf.getvalue(), "image/jpeg")}).status_code == 201

        detail = client.get(f"/api/v1/incidents/{rep['incident_id']}/detail", headers=tech).json()
        photos = detail["reports"][0]["photos"]
        assert len(photos) == 1
        img = client.get(f"/api/v1/reports/{rep['id']}/photos/{photos[0]['id']}/content", headers=tech)
        assert img.status_code == 200 and img.headers["content-type"] == "image/jpeg"
        assert len(client.get(f"/api/v1/reports/{rep['id']}/photos", headers=tech).json()) == 1
        # Otra persona ciudadana no puede ver las fotos
        _, intrusa = _user(UserRole.CIUDADANO)
        assert client.get(f"/api/v1/reports/{rep['id']}/photos", headers=intrusa).status_code == 404
    finally:
        storage.get_storage.cache_clear()
