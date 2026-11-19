import hashlib
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.rate_limit import check_rate_limit
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.domain.enums import UserRole
from app.models.entities import RefreshToken, User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _tokens_for_user(user: User) -> TokenResponse:
    sub = str(user.id)
    access = create_access_token(sub, {"role": user.role.value})
    refresh = create_refresh_token(sub)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.jwt_access_ttl_min * 60,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(f"register:{request.client.host if request.client else 'unknown'}", max_calls=5, window_seconds=900)
    if not payload.accept_terms:
        raise HTTPException(status_code=400, detail="Debe aceptar términos")
    existing = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="Email ya registrado")
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        role=UserRole.CIUDADANO,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    tokens = _tokens_for_user(user)
    _store_refresh(db, user.id, tokens.refresh_token)
    return AuthResponse(user=UserOut.model_validate(user), tokens=tokens)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    tokens = _tokens_for_user(user)
    _store_refresh(db, user.id, tokens.refresh_token)
    return AuthResponse(user=UserOut.model_validate(user), tokens=tokens)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    return None


def _store_refresh(db: Session, user_id, token: str) -> None:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_ttl_days)
    db.add(RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires))
    db.commit()