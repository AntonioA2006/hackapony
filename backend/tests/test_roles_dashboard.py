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
        "latitude": random.uniform(19.3, 21.0),
        "longitude": random.uniform(-102.5, -98.6),
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


def test_public_map_shows_unvalidated_incident_flagged(client):
    _, cit = _user(UserRole.CIUDADANO)
    rep = _report(client, cit)
    lat, lon = rep["latitude"], rep["longitude"]
    bbox = f"{lon - 0.02},{lat - 0.02},{lon + 0.02},{lat + 0.02}"
    items = client.get("/api/v1/incidents/public", params={"bbox": bbox}).json()["items"]
    mine = next(i for i in items if i["id"] == rep["incident_id"])
    assert mine["validated"] is False and mine["awaiting_validation"] is True
    assert mine["leak_flow"] == "chorro"
    assert mine["state_name"]  # región resuelta con INEGI


def test_operator_validates_and_dispatches_crew_closes(client):
    """Flujo completo: ciudadano → operador valida y envía a cuadrilla → cuadrilla atiende y cierra."""
    _, cit = _user(UserRole.CIUDADANO)
    _, op = _user(UserRole.OPERADOR)
    crew_id, crew = _user(UserRole.CUADRILLA)
    _, other_crew = _user(UserRole.CUADRILLA)
    rep = _report(client, cit, contact_phone="443 128 4902")
    iid = rep["incident_id"]

    # La cuadrilla no ve órdenes que no son suyas
    assert client.get(f"/api/v1/incidents/{iid}/detail", headers=crew).status_code == 404
    assert iid not in [i["id"] for i in client.get("/api/v1/incidents?status=active", headers=crew).json()["items"]]

    # El operador no puede cerrar la atención; sí validar y despachar
    assert client.patch(f"/api/v1/incidents/{iid}", headers=op, json={"status": "resolved"}).status_code == 403
    res = client.patch(f"/api/v1/incidents/{iid}", headers=op, json={"assigned_to_id": crew_id, "validate_reports": True})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "in_progress" and body["assigned_to"]["id"] == crew_id and body["validated"] is True
    # Solo a cuadrillas: no a otra persona operadora
    op2_id, _ = _user(UserRole.OPERADOR)
    assert client.patch(f"/api/v1/incidents/{iid}", headers=op, json={"assigned_to_id": op2_id}).status_code == 422

    # La cuadrilla asignada ve su orden con el teléfono para llamar
    detail = client.get(f"/api/v1/incidents/{iid}/detail", headers=crew).json()
    assert detail["reports"][0]["contact_phone"] == "4431284902"
    mine = client.get("/api/v1/incidents?status=active", headers=crew).json()["items"]
    assert [i["id"] for i in mine] == [iid]
    # Otra cuadrilla no puede tocarla; la cuadrilla no puede descartar ni reasignar
    assert client.patch(f"/api/v1/incidents/{iid}", headers=other_crew, json={"status": "resolved"}).status_code == 404
    assert client.patch(f"/api/v1/incidents/{iid}", headers=crew, json={"status": "dismissed"}).status_code == 403
    assert client.patch(f"/api/v1/incidents/{iid}", headers=crew, json={"assigned_to_id": crew_id}).status_code == 403

    # Ciudadano: etapa 2 (validado / en atención) mientras la cuadrilla trabaja
    active = client.get("/api/v1/users/me/active-report", headers=cit).json()["active"]
    assert active["stage"] == 2 and active["dispatched"] is True

    res = client.patch(f"/api/v1/incidents/{iid}", headers=crew, json={"status": "resolved"})
    assert res.status_code == 200 and res.json()["closed_at"] is not None
    # Reabrir es solo de supervisión
    assert client.patch(f"/api/v1/incidents/{iid}", headers=op, json={"status": "in_progress"}).status_code == 403
    # El ticket ciudadano se liberó y puede reportar de nuevo
    assert client.get("/api/v1/users/me/active-report", headers=cit).json()["active"] is None
    mine = client.get("/api/v1/users/me/reports", headers=cit).json()["items"]
    assert mine[0]["status"] == "resolved" and mine[0]["incident_status"] == "resolved"
    _report(client, cit)


def test_one_active_ticket_per_citizen(client):
    _, cit = _user(UserRole.CIUDADANO)
    first = _report(client, cit)
    res = client.post(
        "/api/v1/reports",
        headers=cit,
        json={"title": "Otra fuga", "description": "Descripción suficientemente larga", "category": "broken_pipe",
              "latitude": 19.5, "longitude": -100.0},
    )
    assert res.status_code == 409 and first["public_id"] in res.json()["detail"]
    assert client.get("/api/v1/users/me/active-report", headers=cit).json()["active"]["public_id"] == first["public_id"]


def test_invalid_contact_phone_rejected(client):
    _, cit = _user(UserRole.CIUDADANO)
    res = client.post(
        "/api/v1/reports",
        headers=cit,
        json={"title": "Fuga tel", "description": "Descripción suficientemente larga", "category": "broken_pipe",
              "latitude": 19.5, "longitude": -100.0, "contact_phone": "123"},
    )
    assert res.status_code == 422


def test_staff_dashboard_and_region_colors(client):
    _, cit = _user(UserRole.CIUDADANO)
    _, tech = _user(UserRole.OPERADOR)
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
        _, tech = _user(UserRole.OPERADOR)
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
