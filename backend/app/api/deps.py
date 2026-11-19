import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.firebase_auth import FirebaseTokenError, looks_like_firebase_token, verify_id_token
from app.core.security import parse_token_user_id
from app.domain.enums import UserRole
from app.models.entities import User

security = HTTPBearer(auto_error=False)


def _user_from_firebase(token: str, db: Session, project_id: str) -> User:
    try:
        ident = verify_id_token(token, project_id)
    except FirebaseTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Autenticación no disponible") from exc

    user = db.scalar(select(User).where(User.firebase_uid == ident.uid))
    if user is None and ident.email:
        email = ident.email.lower()
        existing = db.scalar(select(User).where(func.lower(User.email) == email))
        if existing is not None:
            # Vincular una cuenta previa solo con email verificado: evita apropiarse de cuentas ajenas
            if not ident.email_verified:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Verifica tu email para vincular tu cuenta existente",
                )
            existing.firebase_uid = ident.uid
            user = existing
        else:
            user = User(
                email=email,
                firebase_uid=ident.uid,
                display_name=(ident.name or email.split("@")[0])[:120],
                role=UserRole.CIUDADANO,
            )
            db.add(user)
        try:
            db.commit()
        except IntegrityError:  # dos peticiones simultáneas del primer inicio de sesión
            db.rollback()
            user = db.scalar(select(User).where(User.firebase_uid == ident.uid))
        if user is not None:
            db.refresh(user)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cuenta sin email")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")
    token = credentials.credentials
    project_id = get_settings().firebase_project_id
    if project_id and looks_like_firebase_token(token):
        return _user_from_firebase(token, db, project_id)
    try:
        user_id = parse_token_user_id(token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from exc
    user = db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user


def require_roles(*roles: UserRole):
    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permiso denegado")
        return user

    return _dep


RequireAdmin = Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR))
RequireSuperAdmin = Depends(require_roles(UserRole.SUPERADMINISTRADOR))