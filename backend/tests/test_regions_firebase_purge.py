"""Regiones INEGI, autenticación con Firebase y purga de fotos al cerrar casos (requieren PostGIS)."""
import io
import os
import time
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from fastapi.testclient import TestClient
from jose import jwt
from PIL import Image
from sqlalchemy import select, text

from app.core import firebase_auth
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password
from app.domain.enums import UserRole
from app.main import app
from app.models.entities import Incident, IncidentHistory, Report, ReportPhoto, User

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="Requiere PostgreSQL/PostGIS migrado, seed INEGI cargado y RUN_DB_TESTS=1",
)

PROJECT = "agua-alerta-test"


@pytest.fixture
def client():
    return TestClient(app)


def _regions_loaded() -> bool:
    with SessionLocal() as db:
        return (db.scalar(text("SELECT count(*) FROM states")) or 0) == 32


needs_regions = pytest.mark.skipif(not _regions_loaded() if os.getenv("RUN_DB_TESTS") == "1" else True,
                                   reason="Ejecutar antes: python -m scripts.load_inegi_seed")


# ---------------------------------------------------------------- regiones


@needs_regions
def test_states_cover_mexico_with_water_indicators(client):
    res = client.get("/api/v1/regions/states")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 32
    cdmx = next(s for s in items if s["cve_ent"] == "09")
    assert cdmx["name"] == "Ciudad de México"
    assert cdmx["water"]["viviendas"] > 2_000_000
    assert 0 <= cdmx["water"]["pct_sin_agua_entubada"] < 100


@needs_regions
def test_locate_resolves_state_and_municipality(client):
    res = client.get("/api/v1/regions/locate", params={"lat": 19.4326, "lon": -99.1332})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["state"]["cve_ent"] == "09"
    assert body["municipality"]["cvegeo"] == "09015"  # Cuauhtémoc
    assert res.headers["cache-control"] == "no-store"


@needs_regions
def test_locate_outside_mexico_is_404(client):
    # Golfo de México, lejos de la costa
    res = client.get("/api/v1/regions/locate", params={"lat": 24.0, "lon": -92.0})
    assert res.status_code == 404


@needs_regions
def test_municipalities_geojson_for_state(client):
    res = client.get("/api/v1/regions/states/09/municipalities.geojson")
    assert res.status_code == 200
    fc = res.json()
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) == 16
    assert fc["features"][0]["geometry"]["type"] in ("MultiPolygon", "Polygon")
    assert "max-age" in res.headers["cache-control"]


# ---------------------------------------------------------------- Firebase


@pytest.fixture
def firebase_keys(monkeypatch):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "test")])
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(UTC) - timedelta(days=1))
        .not_valid_after(datetime.now(UTC) + timedelta(days=1))
        .sign(key, hashes.SHA256())
    )
    pem_cert = cert.public_bytes(serialization.Encoding.PEM).decode()
    pem_key = key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    ).decode()
    monkeypatch.setattr(firebase_auth, "_fetch_certs", lambda: ({"kid-1": pem_cert}, time.time() + 3600))
    firebase_auth._cache.update({"certs": {}, "expires_at": 0.0})
    monkeypatch.setattr(get_settings(), "firebase_project_id", PROJECT)
    return pem_key


def _id_token(pem_key: str, uid: str, email: str, *, verified=True, aud=PROJECT, exp_delta=3600, kid="kid-1"):
    now = int(time.time())
    claims = {
        "iss": f"https://securetoken.google.com/{aud}",
        "aud": aud,
        "sub": uid,
        "auth_time": now - 10,
        "iat": now - 10,
        "exp": now + exp_delta,
        "email": email,
        "email_verified": verified,
        "name": "Ciudadana Prueba",
    }
    return jwt.encode(claims, pem_key, algorithm="RS256", headers={"kid": kid})


def test_firebase_token_provisions_citizen_account(client, firebase_keys):
    uid = uuid.uuid4().hex
    email = f"fb-{uid[:10]}@example.com"
    token = _id_token(firebase_keys, uid, email)

    res = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    assert res.json()["email"] == email
    assert res.json()["role"] == "CIUDADANO"

    upd = client.patch(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {token}"}, json={"display_name": "Nuevo Nombre"}
    )
    assert upd.status_code == 200 and upd.json()["display_name"] == "Nuevo Nombre"
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.firebase_uid == uid))
        assert user is not None and user.password_hash is None


@pytest.mark.parametrize(
    "kwargs",
    [{"aud": "otro-proyecto"}, {"exp_delta": -60}, {"kid": "kid-desconocido"}],
    ids=["audiencia-ajena", "expirado", "kid-desconocido"],
)
def test_firebase_token_rejected(client, firebase_keys, kwargs):
    token = _id_token(firebase_keys, uuid.uuid4().hex, "x@example.com", **kwargs)
    res = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


def test_firebase_cannot_take_over_existing_account_without_verified_email(client, firebase_keys):
    email = f"prev-{uuid.uuid4().hex[:10]}@example.com"
    with SessionLocal() as db:
        db.add(User(email=email, password_hash=hash_password("Pytest123!"), display_name="Previa"))
        db.commit()
    token = _id_token(firebase_keys, uuid.uuid4().hex, email, verified=False)
    res = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 409


# ---------------------------------------------------------------- purga de fotos


def _user_token(role: UserRole) -> str:
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


def _jpeg() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), (10, 120, 200)).save(buf, "JPEG")
    return buf.getvalue()


def test_closing_incident_deletes_its_photos(client, tmp_path, monkeypatch):
    from app.core import storage

    storage.get_storage.cache_clear()
    monkeypatch.setattr(get_settings(), "photos_path", str(tmp_path))
    try:
        citizen = {"Authorization": f"Bearer {_user_token(UserRole.CIUDADANO)}"}
        admin = {"Authorization": f"Bearer {_user_token(UserRole.ADMINISTRADOR)}"}
        rep = client.post(
            "/api/v1/reports",
            headers=citizen,
            json={
                "title": "Fuga con fotos",
                "description": "Descripción suficientemente larga para validar",
                "category": "broken_pipe",
                "severity": "medium",
                "latitude": 20.6597 + (uuid.uuid4().int % 1000) * 1e-5,
                "longitude": -103.3496,
            },
        )
        assert rep.status_code == 201, rep.text
        report_id = rep.json()["id"]
        for _ in range(2):
            up = client.post(
                f"/api/v1/reports/{report_id}/photos", headers=citizen, files={"file": ("f.jpg", _jpeg(), "image/jpeg")}
            )
            assert up.status_code == 201, up.text
        assert len(list(tmp_path.rglob("*.jpg"))) == 2

        incident_id = rep.json()["incident_id"]
        res = client.patch(f"/api/v1/incidents/{incident_id}", headers=admin, json={"status": "resolved"})
        assert res.status_code == 200, res.text

        assert list(tmp_path.rglob("*.jpg")) == []
        with SessionLocal() as db:
            assert db.scalars(select(ReportPhoto).where(ReportPhoto.report_id == uuid.UUID(report_id))).all() == []
            inc = db.get(Incident, uuid.UUID(incident_id))
            assert inc.photos_purged_at is not None
            event = db.scalar(
                select(IncidentHistory).where(
                    IncidentHistory.incident_id == inc.id, IncidentHistory.event_type == "photos_purged"
                )
            )
            assert event is not None and event.payload == {"deleted": 2, "failed": 0}
            # El reporte (el hecho) se conserva
            assert db.get(Report, uuid.UUID(report_id)) is not None
    finally:
        storage.get_storage.cache_clear()


# ---------------------------------------------------------------- validaciones de reporte


@pytest.mark.parametrize(
    "lat,lon,code",
    [(40.7, -74.0, 422), (24.0, -92.0, 422)],  # Nueva York (fuera del rango) y Golfo de México (fuera del polígono)
    ids=["fuera-de-rango", "mar-fuera-de-poligono"],
)
@needs_regions
def test_report_outside_mexico_rejected(client, lat, lon, code):
    token = _user_token(UserRole.CIUDADANO)
    res = client.post(
        "/api/v1/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Fuga fuera",
            "description": "Descripción suficientemente larga",
            "category": "leak_public_road",
            "latitude": lat,
            "longitude": lon,
        },
    )
    assert res.status_code == code, res.text


def test_report_blank_text_rejected(client):
    token = _user_token(UserRole.CIUDADANO)
    res = client.post(
        "/api/v1/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "      ",
            "description": "          ",
            "category": "leak_public_road",
            "latitude": 19.43,
            "longitude": -99.13,
        },
    )
    assert res.status_code == 422
