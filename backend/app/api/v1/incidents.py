import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.domain.enums import STAFF_ROLES, SUPERVISOR_ROLES, IncidentStatus, ReportStatus, UserRole
from app.models.entities import CitizenConfirmation, Incident, IncidentHistory, Municipality, Report, User
from app.schemas.common import PaginatedResponse
from app.schemas.incidents import AssigneeOut, ConfirmResponse, IncidentOut, IncidentPatch, PublicIncidentOut
from app.services.notifications import notify_user
from app.services.photo_retention import CLOSED_STATUSES, purge_incident_photos
from app.domain.waste import estimated_liters
from app.services.priority import recalculate_incident_urgency

router = APIRouter(prefix="/incidents", tags=["incidents"])


_ROW_SQL = text(
    """
    SELECT i.id,
           ST_Y(i.centroid::geometry) AS lat, ST_X(i.centroid::geometry) AS lon,
           m.name AS municipality_name, m.cvegeo, m.cve_ent, s.name AS state_name,
           EXISTS (SELECT 1 FROM reports r WHERE r.incident_id = i.id AND r.status = 'validated') AS validated,
           u.id AS assignee_id, u.display_name AS assignee_name
    FROM incidents i
    LEFT JOIN municipalities m ON m.id = i.municipality_id
    LEFT JOIN states s ON s.cve_ent = m.cve_ent
    LEFT JOIN users u ON u.id = i.assigned_to_id
    WHERE i.id = ANY(:ids)
    """
)


def _extras(db: Session, incidents: list[Incident]) -> dict:
    """Coordenadas, región, validación y asignación de varias incidencias en una sola consulta."""
    if not incidents:
        return {}
    rows = db.execute(_ROW_SQL, {"ids": [i.id for i in incidents]}).mappings().all()
    return {r["id"]: r for r in rows}


def _public(inc: Incident, x) -> PublicIncidentOut:
    return PublicIncidentOut(
        id=str(inc.id),
        public_id=inc.public_id,
        primary_category=inc.primary_category,
        status=inc.status,
        urgency_score=float(inc.urgency_score),
        priority_band=inc.priority_band,
        latitude=x["lat"],
        longitude=x["lon"],
        report_count=inc.report_count,
        confirmation_count=inc.confirmation_count,
        validated=bool(x["validated"]),
        leak_flow=inc.leak_flow,
        state_name=x["state_name"],
        municipality_name=x["municipality_name"],
        opened_at=inc.opened_at,
    )


def _full(inc: Incident, x) -> IncidentOut:
    return IncidentOut(
        **_public(inc, x).model_dump(),
        updated_at=inc.updated_at,
        aggregated_severity=inc.aggregated_severity,
        municipality_id=str(inc.municipality_id) if inc.municipality_id else None,
        cve_ent=x["cve_ent"],
        cvegeo=x["cvegeo"],
        closed_at=inc.closed_at,
        assigned_to=AssigneeOut(id=str(x["assignee_id"]), display_name=x["assignee_name"]) if x["assignee_id"] else None,
        estimated_liters=estimated_liters(inc.leak_flow, inc.opened_at, inc.closed_at),
    )


def _to_public(db: Session, inc: Incident) -> PublicIncidentOut:
    return _public(inc, _extras(db, [inc])[inc.id])


def _to_full(db: Session, inc: Incident) -> IncidentOut:
    return _full(inc, _extras(db, [inc])[inc.id])


def _many_full(db: Session, items: list[Incident]) -> list[IncidentOut]:
    ex = _extras(db, items)
    return [_full(i, ex[i.id]) for i in items]


@router.get("/public", response_model=PaginatedResponse[PublicIncidentOut])
def public_incidents(
    response: Response,
    page: int = 1,
    page_size: int = 50,
    cve_ent: str | None = Query(None, pattern=r"^\d{1,2}$", description="Clave de entidad INEGI"),
    cvegeo: str | None = Query(None, pattern=r"^\d{5}$", description="Clave geoestadística del municipio"),
    bbox: str | None = Query(None, description="minLon,minLat,maxLon,maxLat"),
    db: Session = Depends(get_db),
):
    page_size = min(max(page_size, 1), 500)
    # Se publican también las incidencias sin validar (marcadas en el mapa); se ocultan las que solo
    # tienen reportes rechazados por el personal.
    publishable_ids = (
        select(Report.incident_id)
        .where(Report.incident_id.isnot(None), Report.status != ReportStatus.rejected)
        .distinct()
    )
    q = select(Incident).where(
        Incident.status.notin_([IncidentStatus.dismissed, IncidentStatus.resolved]),
        Incident.id.in_(publishable_ids),
    )
    if cve_ent or cvegeo:
        q = q.join(Municipality, Municipality.id == Incident.municipality_id)
        if cvegeo:
            q = q.where(Municipality.cvegeo == cvegeo)
        if cve_ent:
            q = q.where(Municipality.cve_ent == cve_ent.zfill(2))
    if bbox:
        try:
            xmin, ymin, xmax, ymax = (float(v) for v in bbox.split(","))
        except ValueError as exc:
            raise HTTPException(422, detail="bbox debe ser minLon,minLat,maxLon,maxLat") from exc
        q = q.where(
            func.ST_Intersects(
                func.Geometry(Incident.centroid), func.ST_MakeEnvelope(xmin, ymin, xmax, ymax, 4326)
            )
        )
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    items_db = db.scalars(q.order_by(Incident.urgency_score.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    response.headers["Cache-Control"] = "public, max-age=30"
    ex = _extras(db, list(items_db))
    return PaginatedResponse(
        items=[_public(i, ex[i.id]) for i in items_db],
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
    user=Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 100)
    items = db.scalars(
        select(Incident)
        .where(Incident.status.notin_([IncidentStatus.resolved, IncidentStatus.dismissed]))
        .order_by(Incident.urgency_score.desc())
        .limit(limit)
    ).all()
    return _many_full(db, list(items))


@router.get("", response_model=PaginatedResponse[IncidentOut])
def list_incidents(
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = Query(None, alias="status", description="open,triaged,in_progress,resolved,dismissed o 'active'"),
    cve_ent: str | None = Query(None, pattern=r"^\d{1,2}$"),
    band: str | None = Query(None, pattern=r"^(low|medium|high|critical)$"),
    assigned: str | None = Query(None, pattern=r"^(me|none|any)$"),
    sort: str = Query("-urgency", pattern=r"^-?(urgency|opened|updated)$"),
    user=Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    """Cola de trabajo del personal, con filtros por estado, región, prioridad y asignación."""
    page_size = min(max(page_size, 1), 100)
    q = select(Incident)
    if status_filter == "active":
        q = q.where(Incident.status.notin_([IncidentStatus.resolved, IncidentStatus.dismissed]))
    elif status_filter:
        try:
            q = q.where(Incident.status.in_([IncidentStatus(s_) for s_ in status_filter.split(",")]))
        except ValueError as exc:
            raise HTTPException(422, detail="Estado no válido") from exc
    if cve_ent:
        q = q.join(Municipality, Municipality.id == Incident.municipality_id).where(Municipality.cve_ent == cve_ent.zfill(2))
    if band:
        q = q.where(Incident.priority_band == band)
    if assigned == "me":
        q = q.where(Incident.assigned_to_id == user.id)
    elif assigned == "none":
        q = q.where(Incident.assigned_to_id.is_(None))
    col = {"urgency": Incident.urgency_score, "opened": Incident.opened_at, "updated": Incident.updated_at}[sort.lstrip("-")]
    q_sorted = q.order_by(col.desc() if sort.startswith("-") else col.asc())
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    items = db.scalars(q_sorted.offset((page - 1) * page_size).limit(page_size)).all()
    return PaginatedResponse(items=_many_full(db, list(items)), page=page, page_size=page_size, total=total)


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: uuid.UUID,
    user=Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, detail="Incidencia no encontrada")
    return _to_full(db, incident)


@router.get("/{incident_id}/detail")
def incident_detail(
    incident_id: uuid.UUID,
    user=Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    """Ficha completa para el personal: incidencia, reportes con sus fotos e historial."""
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, detail="Incidencia no encontrada")
    reports = db.execute(
        text(
            """
            SELECT r.id, r.public_id, r.title, r.description, r.category::text AS category, r.severity::text AS severity,
                   r.leak_flow::text AS leak_flow, r.status::text AS status, r.address_reference, r.created_at,
                   ST_Y(r.location::geometry) AS lat, ST_X(r.location::geometry) AS lon, u.display_name AS reporter,
                   COALESCE(json_agg(json_build_object('id', p.id, 'mime_type', p.mime_type, 'size_bytes', p.size_bytes)
                            ORDER BY p.created_at) FILTER (WHERE p.id IS NOT NULL), '[]') AS photos
            FROM reports r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN report_photos p ON p.report_id = r.id
            WHERE r.incident_id = :iid
            GROUP BY r.id, u.display_name
            ORDER BY r.created_at
            """
        ),
        {"iid": str(incident.id)},
    ).mappings().all()
    history = db.execute(
        text(
            """
            SELECT h.created_at AS at, h.event_type AS type, h.payload, u.display_name AS actor
            FROM incident_history h LEFT JOIN users u ON u.id = h.actor_user_id
            WHERE h.incident_id = :iid ORDER BY h.created_at
            """
        ),
        {"iid": str(incident.id)},
    ).mappings().all()
    return {
        "incident": _to_full(db, incident),
        "reports": [{**dict(r), "id": str(r["id"])} for r in reports],
        "history": [dict(h) for h in history],
        "photos_purged_at": incident.photos_purged_at,
    }


TECH_STATUSES = {IncidentStatus.triaged, IncidentStatus.in_progress, IncidentStatus.resolved}


@router.patch("/{incident_id}", response_model=IncidentOut)
def patch_incident(
    incident_id: uuid.UUID,
    payload: IncidentPatch,
    user=Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    incident = db.get(Incident, incident_id, with_for_update=True)
    if not incident:
        raise HTTPException(404, detail="Incidencia no encontrada")
    supervisor = user.role in SUPERVISOR_ROLES
    old = incident.status
    events: list[tuple[str, dict]] = []

    if payload.status and payload.status != old:
        if not supervisor:
            if payload.status not in TECH_STATUSES:
                raise HTTPException(403, detail="Solo supervisión puede descartar o reabrir incidencias")
            if old in CLOSED_STATUSES:
                raise HTTPException(403, detail="Solo supervisión puede reabrir una incidencia cerrada")
            if incident.assigned_to_id not in (None, user.id):
                raise HTTPException(403, detail="La incidencia está asignada a otro técnico")
        incident.status = payload.status
        if payload.status in CLOSED_STATUSES:
            incident.closed_at = datetime.now(UTC)
        elif old in CLOSED_STATUSES:
            incident.closed_at = None
        # Quien la pone en atención y no estaba asignada, la toma
        if payload.status == IncidentStatus.in_progress and incident.assigned_to_id is None and user.role not in SUPERVISOR_ROLES:
            incident.assigned_to_id = user.id
            events.append(("assigned", {"to": str(user.id), "self": True}))
        events.append(("status_changed", {"from": old.value, "to": incident.status.value}))

    if payload.assign_to_me:
        if incident.assigned_to_id not in (None, user.id) and not supervisor:
            raise HTTPException(409, detail="La incidencia ya está asignada a otro técnico")
        incident.assigned_to_id = user.id
        events.append(("assigned", {"to": str(user.id), "self": True}))
    elif payload.unassign:
        if not supervisor and incident.assigned_to_id != user.id:
            raise HTTPException(403, detail="Solo puedes liberar incidencias asignadas a ti")
        incident.assigned_to_id = None
        events.append(("unassigned", {}))
    elif payload.assigned_to_id is not None:
        if not supervisor:
            raise HTTPException(403, detail="Solo supervisión puede asignar incidencias a otros")
        tech = db.get(User, payload.assigned_to_id)
        if not tech or tech.role not in STAFF_ROLES or not tech.is_active:
            raise HTTPException(422, detail="La persona asignada debe ser técnico activo")
        incident.assigned_to_id = tech.id
        events.append(("assigned", {"to": str(tech.id)}))

    if payload.aggregated_severity:
        incident.aggregated_severity = payload.aggregated_severity
        events.append(("severity_changed", {"to": payload.aggregated_severity.value}))
    if payload.leak_flow:
        incident.leak_flow = payload.leak_flow
        events.append(("flow_changed", {"to": payload.leak_flow.value}))

    recalculate_incident_urgency(db, incident)
    for event_type, data in events:
        db.add(IncidentHistory(incident_id=incident.id, actor_user_id=user.id, event_type=event_type, payload=data))

    if incident.status != old and incident.status in (IncidentStatus.in_progress, IncidentStatus.resolved):
        reporters = {r.user_id for r in incident.reports}
        title, body = (
            ("Incidencia en atención", f"La incidencia {incident.public_id} está en atención.")
            if incident.status == IncidentStatus.in_progress
            else ("Incidencia resuelta", f"La incidencia {incident.public_id} fue resuelta. ¡Gracias por reportar!")
        )
        for uid in reporters:
            notify_user(db, uid, f"incident_{incident.status.value}", title, body)
        # El estado del reporte refleja la atención para quien reportó
        for r in incident.reports:
            if r.status != ReportStatus.rejected:
                r.status = ReportStatus.in_progress if incident.status == IncidentStatus.in_progress else ReportStatus.resolved
    if incident.status in CLOSED_STATUSES and old not in CLOSED_STATUSES:
        purge_incident_photos(db, incident, user.id)
    db.commit()
    db.refresh(incident)
    return _to_full(db, incident)


@router.get("/{incident_id}/history")
def incident_history(
    incident_id: uuid.UUID,
    user=Depends(require_roles(*STAFF_ROLES)),
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