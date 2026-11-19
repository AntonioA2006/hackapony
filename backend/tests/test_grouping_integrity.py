"""Pruebas de integridad del agrupamiento y las confirmaciones (requieren PostGIS).

Cubren los defectos D1, D2, D3 y H1 de docs/03-architecture/reference-architecture.md §15.
"""
import os
import random
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password
from app.domain.enums import UserRole
from app.main import app
from app.models.entities import Incident, Report, User

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="Requiere PostgreSQL/PostGIS migrado y RUN_DB_TESTS=1",
)

# ~1 m en grados a latitudes de México (aprox. suficiente para pruebas)
M = 1 / 111_320


def _random_point() -> tuple[float, float]:
    """Punto aleatorio en zona vacía para aislar cada prueba de datos previos."""
    return random.uniform(19.3, 21.0), random.uniform(-102.5, -98.6)  # centro del país, tierra firme


def _make_user(role: UserRole = UserRole.CIUDADANO) -> str:
    with SessionLocal() as db:
        user = User(
            email=f"t-{uuid.uuid4().hex[:12]}@example.com",
            password_hash=hash_password("Pytest123!"),
            display_name="Pytest",
            role=role,
        )
        db.add(user)
        db.commit()
        return create_access_token(str(user.id), {"role": role.value})


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _report_payload(lat: float, lon: float) -> dict:
    return {
        "title": "Fuga de prueba integridad",
        "description": "Descripción suficientemente larga para validar",
        "category": "leak_public_road",
        "severity": "high",
        "latitude": lat,
        "longitude": lon,
        "device_latitude": lat,
        "device_longitude": lon,
    }


def _seed_ageb(min_lon: float, min_lat: float, max_lon: float, max_lat: float, pob: int = 2500):
    """Crea municipio + AGEB rectangular; devuelve (municipality_id, census_area_id)."""
    suffix = f"{random.randint(0, 99_999_999):08d}"
    wkt = (
        f"MULTIPOLYGON((({min_lon} {min_lat},{max_lon} {min_lat},{max_lon} {max_lat},"
        f"{min_lon} {max_lat},{min_lon} {min_lat})))"
    )
    with SessionLocal() as db:
        mun_id = db.execute(
            text(
                """
                INSERT INTO municipalities (id, cve_ent, cve_mun, cvegeo, name, geom, pob_total)
                VALUES (gen_random_uuid(), '99', '999', :cvegeo, 'Pytest',
                        ST_GeomFromText(:wkt, 4326), :pob)
                RETURNING id
                """
            ),
            {"cvegeo": suffix[:9].rjust(9, "9"), "wkt": wkt, "pob": pob * 10},
        ).scalar_one()
        ca_id = db.execute(
            text(
                """
                INSERT INTO census_areas
                    (id, municipality_id, cvegeo, cve_ent, cve_mun, cve_ageb, geom, pob_total)
                VALUES (gen_random_uuid(), :mun, :cvegeo, '99', '999', '0001',
                        ST_GeomFromText(:wkt, 4326), :pob)
                RETURNING id
                """
            ),
            {"mun": mun_id, "cvegeo": ("99999" + suffix)[:13], "wkt": wkt, "pob": pob},
        ).scalar_one()
        db.commit()
        return mun_id, ca_id


def _incident_of(report_public_id: str) -> Incident:
    with SessionLocal() as db:
        report = db.scalar(select(Report).where(Report.public_id == report_public_id))
        assert report is not None and report.incident_id is not None
        incident = db.get(Incident, report.incident_id)
        db.expunge(incident)
        return incident


@pytest.fixture
def client():
    return TestClient(app)


def test_new_incident_gets_territorial_context(client):
    """D1: la incidencia creada hereda municipio y AGEB y el factor I entra en la urgencia."""
    lat, lon = _random_point()
    mun_id, ca_id = _seed_ageb(lon - 0.001, lat - 0.001, lon + 0.001, lat + 0.001)
    token = _make_user()

    res = client.post("/api/v1/reports", headers=_auth(token), json=_report_payload(lat, lon))
    assert res.status_code == 201, res.text

    incident = _incident_of(res.json()["public_id"])
    assert incident.census_area_id == ca_id
    assert incident.municipality_id == mun_id
    # S(high)=32 + C(1 reporte)=3 + I(2500 hab)≈17.1 + T≈0  →  > 50 solo si I se aplicó
    assert float(incident.urgency_score) > 50


def test_linked_report_reassigns_incident_context(client):
    """D2: al vincular un reporte y mover el centroide, la incidencia toma el AGEB del nuevo centroide."""
    lat, lon = _random_point()
    # AGEB que empieza justo al este de `lon`
    mun_id, ca_id = _seed_ageb(lon, lat - 0.001, lon + 0.002, lat + 0.001)

    first = client.post(
        "/api/v1/reports", headers=_auth(_make_user()), json=_report_payload(lat, lon - 20 * M)
    )
    assert first.status_code == 201, first.text
    assert _incident_of(first.json()["public_id"]).census_area_id is None

    second = client.post(
        "/api/v1/reports", headers=_auth(_make_user()), json=_report_payload(lat, lon + 40 * M)
    )
    assert second.status_code == 201, second.text

    incident = _incident_of(second.json()["public_id"])
    assert incident.report_count == 2
    # centroide ≈ lon + 10 m → dentro del AGEB
    assert incident.census_area_id == ca_id
    assert incident.municipality_id == mun_id


def test_concurrent_reports_same_spot_create_single_incident():
    """H1: reportes simultáneos en el mismo punto no deben crear incidencias duplicadas."""
    lat, lon = _random_point()
    tokens = [_make_user() for _ in range(6)]

    def submit(i: int):
        with TestClient(app) as c:
            return c.post(
                "/api/v1/reports",
                headers=_auth(tokens[i]),
                json=_report_payload(lat + i * 3 * M, lon),
            )

    with ThreadPoolExecutor(max_workers=len(tokens)) as pool:
        results = list(pool.map(submit, range(len(tokens))))

    assert all(r.status_code == 201 for r in results), [r.text for r in results]
    incident_ids = {_incident_of(r.json()["public_id"]).id for r in results}
    assert len(incident_ids) == 1
    with SessionLocal() as db:
        assert db.get(Incident, incident_ids.pop()).report_count == len(tokens)


def _create_incident(client) -> str:
    lat, lon = _random_point()
    res = client.post("/api/v1/reports", headers=_auth(_make_user()), json=_report_payload(lat, lon))
    assert res.status_code == 201, res.text
    return str(_incident_of(res.json()["public_id"]).id)


def test_concurrent_confirmations_are_all_counted(client):
    """D3: confirmaciones simultáneas de usuarios distintos no pierden incrementos."""
    incident_id = _create_incident(client)
    tokens = [_make_user() for _ in range(8)]

    def confirm(token: str):
        with TestClient(app) as c:
            return c.post(f"/api/v1/incidents/{incident_id}/confirm", headers=_auth(token))

    with ThreadPoolExecutor(max_workers=len(tokens)) as pool:
        results = list(pool.map(confirm, tokens))

    assert all(r.status_code == 201 for r in results), [r.text for r in results]
    with SessionLocal() as db:
        assert db.get(Incident, uuid.UUID(incident_id)).confirmation_count == len(tokens)


def test_double_click_confirmation_returns_409_not_500(client):
    """D3: el mismo usuario confirmando dos veces a la vez obtiene 201 + 409, nunca 500."""
    incident_id = _create_incident(client)
    token = _make_user()

    def confirm(_):
        with TestClient(app, raise_server_exceptions=False) as c:
            return c.post(f"/api/v1/incidents/{incident_id}/confirm", headers=_auth(token))

    with ThreadPoolExecutor(max_workers=4) as pool:
        codes = sorted(r.status_code for r in pool.map(confirm, range(4)))

    assert codes == [201, 409, 409, 409]
    with SessionLocal() as db:
        assert db.get(Incident, uuid.UUID(incident_id)).confirmation_count == 1
