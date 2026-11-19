import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="Requiere PostgreSQL migrado y RUN_DB_TESTS=1",
)


@pytest.fixture
def client():
    return TestClient(app)


def test_password_reset_flow(client, monkeypatch):
    monkeypatch.setenv("PASSWORD_RESET_DEV_EXPOSE_TOKEN", "true")
    from app.core.config import get_settings

    get_settings.cache_clear()

    email = f"reset_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Original123!",
            "display_name": "Reset Test",
            "accept_terms": True,
        },
    )
    assert reg.status_code == 201

    req = client.post("/api/v1/auth/password-reset/request", json={"email": email})
    assert req.status_code == 202
    token = req.json().get("dev_reset_token")
    assert token

    bad = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": "NuevaClave123!"},
    )
    assert bad.status_code == 204

    login_old = client.post("/api/v1/auth/login", json={"email": email, "password": "Original123!"})
    assert login_old.status_code == 401

    login_new = client.post("/api/v1/auth/login", json={"email": email, "password": "NuevaClave123!"})
    assert login_new.status_code == 200

    get_settings.cache_clear()