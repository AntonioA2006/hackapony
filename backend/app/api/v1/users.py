import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.domain.enums import STAFF_ROLES, SUPERVISOR_ROLES, ReportStatus, UserRole
from app.models.entities import Notification, Report, User
from app.services.notifications import notify_user
from app.schemas.auth import UserOut
from app.schemas.common import PaginatedResponse
from app.schemas.reports import ReportOut

router = APIRouter(prefix="/users", tags=["users"])


def _report_to_out(db: Session, report: Report) -> ReportOut:
    row = db.execute(
        __import__("sqlalchemy").text(
            "SELECT ST_Y(location::geometry), ST_X(location::geometry) FROM reports WHERE id = :id"
        ),
        {"id": str(report.id)},
    ).one()
    return ReportOut(
        id=str(report.id),
        public_id=report.public_id,
        status=report.status,
        title=report.title,
        description=report.description,
        category=report.category,
        severity=report.severity,
        latitude=row[0],
        longitude=row[1],
        address_reference=report.address_reference,
        incident_id=str(report.incident_id) if report.incident_id else None,
        created_at=report.created_at,
        reported_at=report.reported_at,
        leak_flow=report.leak_flow,
        incident_status=report.incident.status.value if report.incident is not None else None,
    )


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return UserOut.model_validate(user)


class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=2, max_length=120)


@router.patch("/me", response_model=UserOut)
def update_me(payload: ProfileUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Actualiza datos de perfil propios. Email y contraseña se cambian en Firebase Authentication."""
    user.display_name = payload.display_name.strip()
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/me/reports", response_model=PaginatedResponse[ReportOut])
def my_reports(
    page: int = 1,
    page_size: int = 20,
    status: ReportStatus | None = None,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page_size = min(max(page_size, 1), 100)
    q = select(Report).where(Report.user_id == user.id)
    if status:
        q = q.where(Report.status == status)
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    reports = db.scalars(q.order_by(Report.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return PaginatedResponse(
        items=[_report_to_out(db, r) for r in reports],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/me/notifications", response_model=PaginatedResponse[dict])
def my_notifications(
    page: int = 1,
    page_size: int = 20,
    unread_only: bool = False,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page_size = min(max(page_size, 1), 100)
    q = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        q = q.where(Notification.read_at.is_(None))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.scalars(q.order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    items = [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "read_at": n.read_at,
            "created_at": n.created_at,
            "metadata": n.metadata_json,
        }
        for n in rows
    ]
    return PaginatedResponse(items=items, page=page, page_size=page_size, total=total)


@router.patch("/me/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_notification_read(
    notification_id: uuid.UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.get(Notification, notification_id)
    if not notification or notification.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    notification.read_at = datetime.now(UTC)
    db.commit()
    return None


# ---------------------------------------------------------------- gestión de personal (supervisión)


class StaffUserOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    open_assigned: int = 0
    resolved_total: int = 0


class RoleChange(BaseModel):
    role: UserRole


def _staff_out(db: Session, users: list[User]) -> list[StaffUserOut]:
    if not users:
        return []
    stats = {
        r.uid: r
        for r in db.execute(
            text(
                """
                SELECT assigned_to_id AS uid,
                       count(*) FILTER (WHERE status NOT IN ('resolved','dismissed')) AS open_assigned,
                       count(*) FILTER (WHERE status = 'resolved') AS resolved_total
                FROM incidents WHERE assigned_to_id = ANY(:ids) GROUP BY assigned_to_id
                """
            ),
            {"ids": [u.id for u in users]},
        )
    }
    return [
        StaffUserOut(
            id=str(u.id),
            email=u.email,
            display_name=u.display_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            open_assigned=int(stats[u.id].open_assigned) if u.id in stats else 0,
            resolved_total=int(stats[u.id].resolved_total) if u.id in stats else 0,
        )
        for u in users
    ]


@router.get("", response_model=PaginatedResponse[StaffUserOut])
def list_users(
    q: str | None = None,
    role: UserRole | None = None,
    page: int = 1,
    page_size: int = 25,
    user=Depends(require_roles(*SUPERVISOR_ROLES)),
    db: Session = Depends(get_db),
):
    """Supervisión: busca personas por ID, correo o nombre para nombrarlas técnico."""
    page_size = min(max(page_size, 1), 100)
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if q:
        term = q.strip()
        try:
            stmt = stmt.where(User.id == uuid.UUID(term))
        except ValueError:
            like = f"%{term.lower()}%"
            stmt = stmt.where(or_(func.lower(User.email).like(like), func.lower(User.display_name).like(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return PaginatedResponse(items=_staff_out(db, list(rows)), page=page, page_size=page_size, total=total)


@router.get("/technicians", response_model=list[StaffUserOut])
def list_technicians(user=Depends(require_roles(*STAFF_ROLES)), db: Session = Depends(get_db)):
    """Personal que puede atender incidencias (para asignar y para ver carga de trabajo)."""
    rows = db.scalars(
        select(User).where(User.role.in_(STAFF_ROLES), User.is_active.is_(True)).order_by(User.display_name)
    ).all()
    return _staff_out(db, list(rows))


@router.patch("/{user_id}/role", response_model=StaffUserOut)
def change_role(
    user_id: uuid.UUID,
    payload: RoleChange,
    user=Depends(require_roles(*SUPERVISOR_ROLES)),
    db: Session = Depends(get_db),
):
    """Supervisión nombra técnicos (o los regresa a ciudadano) usando el ID que la persona ve en su perfil."""
    if payload.role not in (UserRole.CIUDADANO, UserRole.TECNICO):
        raise HTTPException(422, detail="Solo se puede asignar el rol de técnico o ciudadano")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, detail="No existe una cuenta con ese ID")
    if target.id == user.id:
        raise HTTPException(409, detail="No puedes cambiar tu propio rol")
    if target.role in SUPERVISOR_ROLES:
        raise HTTPException(403, detail="No se puede cambiar el rol de otra persona supervisora")
    if payload.role == UserRole.CIUDADANO:
        # Al dejar de ser técnico, sus casos abiertos vuelven a la cola sin asignar
        db.execute(
            text("UPDATE incidents SET assigned_to_id = NULL WHERE assigned_to_id = :u AND status NOT IN ('resolved','dismissed')"),
            {"u": str(target.id)},
        )
    old = target.role
    target.role = payload.role
    notify_user(
        db,
        target.id,
        "role_changed",
        "Tu rol cambió",
        "Ahora eres técnico: ya puedes ver y atender incidencias." if payload.role == UserRole.TECNICO else "Tu cuenta volvió a ser ciudadana.",
        {"from": old.value, "to": payload.role.value, "by": str(user.id)},
    )
    db.commit()
    db.refresh(target)
    return _staff_out(db, [target])[0]
