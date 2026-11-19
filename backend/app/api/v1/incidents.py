import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.domain.enums import IncidentStatus, UserRole
from app.models.entities import CitizenConfirmation, Incident, IncidentHistory
from app.schemas.common import PaginatedResponse
from app.schemas.incidents import ConfirmResponse, IncidentOut, IncidentPatch, PublicIncidentOut
from app.services.notifications import notify_user
from app.services.priority import recalculate_incident_urgency

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _incident_coords(db: Session, inc: Incident) -> tuple[float, float]:
    row = db.execute(
        text("SELECT ST_Y(centroid::geometry), ST_X(centroid::geometry) FROM incidents WHERE id = :id"),
        {"id": str(inc.id)},
    ).one()
    return row[0], row[1]


def _to_public(db: Session, inc: Incident) -> PublicIncidentOut:
    lat, lon = _incident_coords(db, inc)
    return PublicIncidentOut(
        id=str(inc.id),
        public_id=inc.public_id,
        primary_category=inc.primary_category,
        status=inc.status,
        urgency_score=float(inc.urgency_score),
        priority_band=inc.priority_band,
        latitude=lat,
        longitude=lon,
        report_count=inc.report_count,
        confirmation_count=inc.confirmation_count,
    )


def _to_full(db: Session, inc: Incident) -> IncidentOut:
    base = _to_public(db, inc)
    return IncidentOut(
        **base.model_dump(),
        opened_at=inc.opened_at,
        updated_at=inc.updated_at,
        aggregated_severity=inc.aggregated_severity,
        municipality_id=str(inc.municipality_id) if inc.municipality_id else None,
    )


@router.get("/public", response_model=PaginatedResponse[PublicIncidentOut])
def public_incidents(
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    page_size = min(max(page_size, 1), 100)
    q = select(Incident).where(Incident.status.notin_([IncidentStatus.dismissed, IncidentStatus.resolved]))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    items_db = db.scalars(q.order_by(Incident.urgency_score.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return PaginatedResponse(
        items=[_to_public(db, i) for i in items_db],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.post("/{incident_id}/confirm", response_model=ConfirmResponse, status_code=201)
def confirm_incident(
    incident_id: uuid.UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Bloquea la fila: serializa confirmaciones concurrentes de la misma incidencia (D3)
    incident = db.get(Incident, incident_id, with_for_update=True, populate_existing=True)
    if not incident or incident.status in (IncidentStatus.resolved, IncidentStatus.dismissed):
        raise HTTPException(404, detail="Incidencia no disponible")
    inserted = db.execute(
        pg_insert(CitizenConfirmation)
        .values(id=uuid.uuid4(), incident_id=incident.id, user_id=user.id)
        .on_conflict_do_nothing(constraint="citizen_confirmations_unique")
        .returning(CitizenConfirmation.id)
    ).first()
    if inserted is None:
        db.rollback()
        raise HTTPException(409, detail="Ya confirmaste esta incidencia")
    incident.confirmation_count = Incident.confirmation_count + 1
    db.flush()
    db.refresh(incident, attribute_names=["confirmation_count"])
    recalculate_incident_urgency(db, incident)
    db.add(
        IncidentHistory(
            incident_id=incident.id,
            actor_user_id=user.id,
            event_type="confirmation",
            payload={"user_id": str(user.id)},
        )
    )
    db.commit()
    db.refresh(incident)
    return ConfirmResponse(confirmation_count=incident.confirmation_count)


@router.get("/priority", response_model=list[IncidentOut])
def priority_queue(
    limit: int = 20,
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 100)
    items = db.scalars(
        select(Incident)
        .where(Incident.status.notin_([IncidentStatus.resolved, IncidentStatus.dismissed]))
        .order_by(Incident.urgency_score.desc())
        .limit(limit)
    ).all()
    return [_to_full(db, i) for i in items]


@router.get("", response_model=PaginatedResponse[IncidentOut])
def list_incidents(
    page: int = 1,
    page_size: int = 20,
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    page_size = min(max(page_size, 1), 100)
    q = select(Incident)
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    items = db.scalars(q.order_by(Incident.urgency_score.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return PaginatedResponse(items=[_to_full(db, i) for i in items], page=page, page_size=page_size, total=total)


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: uuid.UUID,
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, detail="Incidencia no encontrada")
    return _to_full(db, incident)


@router.patch("/{incident_id}", response_model=IncidentOut)
def patch_incident(
    incident_id: uuid.UUID,
    payload: IncidentPatch,
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, detail="Incidencia no encontrada")
    old = incident.status
    if payload.status:
        incident.status = payload.status
    if payload.aggregated_severity:
        incident.aggregated_severity = payload.aggregated_severity
    recalculate_incident_urgency(db, incident)
    db.add(
        IncidentHistory(
            incident_id=incident.id,
            actor_user_id=user.id,
            event_type="status_changed",
            payload={"from": old.value, "to": incident.status.value},
        )
    )
    if payload.status == IncidentStatus.in_progress:
        for r in incident.reports:
            notify_user(
                db,
                r.user_id,
                "incident_in_progress",
                "Incidencia en atención",
                f"La incidencia {incident.public_id} está en atención.",
            )
    if payload.status == IncidentStatus.resolved:
        for r in incident.reports:
            notify_user(
                db,
                r.user_id,
                "incident_resolved",
                "Incidencia resuelta",
                f"La incidencia {incident.public_id} fue resuelta.",
            )
    db.commit()
    db.refresh(incident)
    return _to_full(db, incident)


@router.get("/{incident_id}/history")
def incident_history(
    incident_id: uuid.UUID,
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(IncidentHistory).where(IncidentHistory.incident_id == incident_id).order_by(IncidentHistory.created_at)
    ).all()
    return [
        {
            "at": h.created_at,
            "type": h.event_type,
            "payload": h.payload,
            "actor_user_id": str(h.actor_user_id) if h.actor_user_id else None,
        }
        for h in rows
    ]