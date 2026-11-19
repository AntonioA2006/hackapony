import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from geoalchemy2 import Geometry
from sqlalchemy import cast, func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.domain.enums import IncidentStatus, ReportStatus, UserRole
from app.models.entities import CitizenConfirmation, Incident, IncidentHistory, Municipality, Report
from app.schemas.common import PaginatedResponse
from app.schemas.incidents import ConfirmResponse, IncidentOut, IncidentPatch, PublicIncidentOut
from app.services.notifications import notify_user
from app.services.photo_retention import CLOSED_STATUSES, purge_incident_photos
from app.services.priority import recalculate_incident_urgency
from app.services.public_geo import (
    PUBLIC_PAGE_SIZE_DEFAULT,
    BBoxError,
    clamp_public_page,
    parse_bbox,
)

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _incident_coords(db: Session, inc: Incident) -> tuple[float, float]:
    """Centroide real. Solo para respuestas de operación (admin)."""
    row = db.execute(
        text("SELECT ST_Y(centroid::geometry), ST_X(centroid::geometry) FROM incidents WHERE id = :id"),
        {"id": str(inc.id)},
    ).one()
    return row[0], row[1]


def _public_out(inc: Incident, lat: float, lon: float, *, awaiting_validation: bool = False) -> PublicIncidentOut:
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
        awaiting_validation=awaiting_validation,
    )


def _to_full(db: Session, inc: Incident) -> IncidentOut:
    lat, lon = _incident_coords(db, inc)
    return IncidentOut(
        **_public_out(inc, lat, lon).model_dump(),
        opened_at=inc.opened_at,
        updated_at=inc.updated_at,
        aggregated_severity=inc.aggregated_severity,
        municipality_id=str(inc.municipality_id) if inc.municipality_id else None,
    )


@router.get("/public", response_model=PaginatedResponse[PublicIncidentOut])
def public_incidents(
    response: Response,
    page: int = 1,
    page_size: int = PUBLIC_PAGE_SIZE_DEFAULT,
    cve_ent: str | None = Query(None, pattern=r"^\d{1,2}$", description="Clave de entidad INEGI"),
    cvegeo: str | None = Query(None, pattern=r"^\d{5}$", description="Clave geoestadística del municipio"),
    bbox: str | None = Query(None, max_length=200, description="minLon,minLat,maxLon,maxLat"),
    db: Session = Depends(get_db),
):
    page, page_size = clamp_public_page(page, page_size)
    if bbox:
        try:
            min_lon, min_lat, max_lon, max_lat = parse_bbox(bbox)
        except BBoxError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    # El mapa público es para quien no administra: solo incidencias con un reporte
    # validado. Las recién enviadas no salen aquí.
    validated_incident_ids = (
        select(Report.incident_id)
        .where(
            Report.incident_id.isnot(None),
            Report.status == ReportStatus.validated,
        )
        .distinct()
    )
    q = select(Incident).where(
        Incident.status.notin_([IncidentStatus.dismissed, IncidentStatus.resolved]),
        Incident.id.in_(validated_incident_ids),
    )
    if cve_ent or cvegeo:
        q = q.join(Municipality, Municipality.id == Incident.municipality_id)
        if cvegeo:
            q = q.where(Municipality.cvegeo == cvegeo)
        if cve_ent:
            q = q.where(Municipality.cve_ent == cve_ent.zfill(2))
    if bbox:
        # && sobre geography usa el índice GiST de public_location. Filtrar el
        # centroide permitiría acorralar el punto real encogiendo el rectángulo.
        q = q.where(_bbox_on("incidents.public_location", (min_lon, min_lat, max_lon, max_lat)))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    pub_lat = func.ST_Y(cast(Incident.public_location, Geometry)).label("pub_lat")
    pub_lon = func.ST_X(cast(Incident.public_location, Geometry)).label("pub_lon")
    rows = db.execute(
        q.add_columns(pub_lat, pub_lon)
        .order_by(Incident.urgency_score.desc(), Incident.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    response.headers["Cache-Control"] = "public, max-age=30"
    return PaginatedResponse(
        items=[_public_out(inc, lat, lon) for inc, lat, lon in rows],
        page=page,
        page_size=page_size,
        total=total,
    )


def _bbox_on(column_sql: str, box: tuple[float, float, float, float]):
    min_lon, min_lat, max_lon, max_lat = box
    return text(
        f"{column_sql} && ST_MakeEnvelope(:bb_xmin, :bb_ymin, :bb_xmax, :bb_ymax, 4326)::geography"
    ).bindparams(bb_xmin=min_lon, bb_ymin=min_lat, bb_xmax=max_lon, bb_ymax=max_lat)


@router.get("/map", response_model=PaginatedResponse[PublicIncidentOut])
def admin_map_incidents(
    page: int = 1,
    page_size: int = PUBLIC_PAGE_SIZE_DEFAULT,
    bbox: str | None = Query(None, max_length=200, description="minLon,minLat,maxLon,maxLat"),
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    """Todas las incidencias abiertas del viewport, también las que nadie ha validado."""
    page, page_size = clamp_public_page(page, page_size)
    box = None
    if bbox:
        try:
            box = parse_bbox(bbox)
        except BBoxError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    publishable_incident_ids = (
        select(Report.incident_id)
        .where(
            Report.incident_id.isnot(None),
            Report.status != ReportStatus.rejected,
        )
        .distinct()
    )
    has_validated = (
        select(Report.id)
        .where(Report.incident_id == Incident.id, Report.status == ReportStatus.validated)
        .correlate(Incident)
        .exists()
    )
    q = select(Incident).where(
        Incident.status.notin_([IncidentStatus.dismissed, IncidentStatus.resolved]),
        Incident.id.in_(publishable_incident_ids),
    )
    if box:
        q = q.where(_bbox_on("incidents.centroid", box))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    lat_c = func.ST_Y(cast(Incident.centroid, Geometry)).label("lat")
    lon_c = func.ST_X(cast(Incident.centroid, Geometry)).label("lon")
    rows = db.execute(
        q.add_columns(lat_c, lon_c, has_validated.label("has_validated"))
        .order_by(Incident.urgency_score.desc(), Incident.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return PaginatedResponse(
        items=[_public_out(inc, lat, lon, awaiting_validation=not validated) for inc, lat, lon, validated in rows],
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
    already_reported = db.scalar(
        select(Report.id).where(Report.incident_id == incident.id, Report.user_id == user.id).limit(1)
    )
    if already_reported:
        raise HTTPException(400, detail="No puedes confirmar una incidencia que tú reportaste")
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
    if incident.status in CLOSED_STATUSES and old not in CLOSED_STATUSES:
        purge_incident_photos(db, incident, user.id)
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