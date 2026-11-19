import hashlib
from datetime import UTC, datetime, timedelta
from uuid import UUID

from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_refresh_token
from app.models.entities import RefreshToken, User

settings = get_settings()


def refresh_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def find_valid_refresh_row(db: Session, token: str) -> RefreshToken | None:
    try:
        payload = decode_refresh_token(token)
    except JWTError:
        return None
    if payload.get("type") != "refresh":
        return None
    row = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == refresh_token_hash(token),
            RefreshToken.revoked_at.is_(None),
        )
    )
    if not row or row.expires_at < datetime.now(UTC):
        return None
    return row


def revoke_refresh_token(db: Session, token: str) -> None:
    row = find_valid_refresh_row(db, token)
    if row:
        row.revoked_at = datetime.now(UTC)
        db.commit()


def store_refresh_token(db: Session, user_id: UUID, token: str, *, commit: bool = True) -> None:
    expires = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_ttl_days)
    db.add(RefreshToken(user_id=user_id, token_hash=refresh_token_hash(token), expires_at=expires))
    if commit:
        db.commit()


def user_for_refresh(db: Session, token: str) -> User | None:
    row = find_valid_refresh_row(db, token)
    if not row:
        return None
    user = db.get(User, row.user_id)
    if not user or not user.is_active:
        return None
    return user