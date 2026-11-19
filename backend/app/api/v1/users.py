import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.domain.enums import ReportStatus
from app.models.entities import Notification, Report
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