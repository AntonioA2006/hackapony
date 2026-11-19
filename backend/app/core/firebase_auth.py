"""Verificación de ID tokens de Firebase Authentication sin SDK de administrador.

Sigue el procedimiento documentado por Firebase: RS256, `kid` presente en los certificados públicos
de securetoken@system.gserviceaccount.com, `aud` = project_id, `iss` = https://securetoken.google.com/<project_id>,
`sub` no vacío y `auth_time` en el pasado. Los certificados se cachean según su Cache-Control.
"""
from __future__ import annotations

import re
import threading
import time
from dataclasses import dataclass

import httpx
from jose import jwt
from jose.exceptions import JWTError

CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_lock = threading.Lock()
_cache: dict = {"certs": {}, "expires_at": 0.0}


class FirebaseTokenError(Exception):
    pass


@dataclass(frozen=True)
class FirebaseIdentity:
    uid: str
    email: str | None
    email_verified: bool
    name: str | None


def _fetch_certs() -> tuple[dict[str, str], float]:
    resp = httpx.get(CERTS_URL, timeout=10.0)
    resp.raise_for_status()
    match = re.search(r"max-age=(\d+)", resp.headers.get("cache-control", ""))
    ttl = int(match.group(1)) if match else 3600
    return resp.json(), time.time() + ttl


def _certs(force: bool = False) -> dict[str, str]:
    with _lock:
        if force or time.time() >= _cache["expires_at"] or not _cache["certs"]:
            _cache["certs"], _cache["expires_at"] = _fetch_certs()
        return _cache["certs"]


def looks_like_firebase_token(token: str) -> bool:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError:
        return False
    return header.get("alg") == "RS256" and bool(header.get("kid"))


def verify_id_token(token: str, project_id: str) -> FirebaseIdentity:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise FirebaseTokenError("Token mal formado") from exc
    if header.get("alg") != "RS256":
        raise FirebaseTokenError("Algoritmo no permitido")
    kid = header.get("kid")
    certs = _certs()
    if kid not in certs:
        certs = _certs(force=True)  # rotación de claves de Google
    cert = certs.get(kid)
    if cert is None:
        raise FirebaseTokenError("Clave de firma desconocida")
    try:
        claims = jwt.decode(
            token,
            cert,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
            options={"verify_at_hash": False},
        )
    except JWTError as exc:
        raise FirebaseTokenError("Token inválido o expirado") from exc
    sub = claims.get("sub")
    if not sub or not isinstance(sub, str) or len(sub) > 128:
        raise FirebaseTokenError("sub inválido")
    if float(claims.get("auth_time", 0)) > time.time() + 60:
        raise FirebaseTokenError("auth_time en el futuro")
    return FirebaseIdentity(
        uid=sub,
        email=(claims.get("email") or None),
        email_verified=bool(claims.get("email_verified")),
        name=claims.get("name"),
    )
