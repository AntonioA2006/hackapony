import mimetypes
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.core.rate_limit import check_rate_limit
from fastapi.responses import FileResponse
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.config import get_settings
from app.core.database import get_db
from app.domain.enums import ReportStatus, UserRole
from app.models.entities import IncidentHistory, Report, ReportPhoto
from app.schemas.common import PaginatedResponse
from app.schemas.reports import HistoryItem, ReportCreate, ReportCreateResponse, ReportOut, ReportPatch, ReportPhotoOut
from app.services.grouping import nearby_public_suggestions, process_report_grouping
from app.services.notifications import notify_user
from app.services.spatial import point_wkt
from app.utils.ids import new_public_id

router = APIRouter(prefix="/reports", tags=["reports"])
settings = get_settings()


def _coords(db: Session, report_id) -> tuple[float, float]:
    row = db.execute(
        text("SELECT ST_Y(location::geometry), ST_X(location::geometry) FROM reports WHERE id = :id"),
        {"id": str(report_id)},
    ).one()
    return row[0], row[1]


def _to_out(db: Session, report: Report, suggestions=None) -> ReportOut:
    lat, lon = _coords(db, report.id)
    return ReportOut(
        id=str(report.id),
        public_id=report.public_id,
        status=report.status,
        title=report.title,
        description=report.description,
        category=report.category,
        severity=report.severity,
        latitude=lat,
        longitude=lon,
        address_reference=report.address_reference,
        incident_id=str(report.incident_id) if report.incident_id else None,
        created_at=report.created_at,
        reported_at=report.reported_at,
        nearby_suggestions=suggestions or [],
    )


@router.post("", response_model=ReportCreateResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportCreate,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(f"report:{user.id}", max_calls=10, window_seconds=3600)
    check_rate_limit(f"report-ip:{request.client.host if request.client else 'unknown'}", max_calls=30, window_seconds=3600)
    suggestions_raw = nearby_public_suggestions(db, payload.latitude, payload.longitude, payload.category)
    suggestions = [
        {
            "incident_id": str(s["id"]),
            "public_id": s["public_id"],
            "distance_m": float(s["dist"]),
        }
        for s in suggestions_raw
    ]
    report = Report(
        public_id=new_public_id("AA"),
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        severity=payload.severity,
        location=point_wkt(payload.latitude, payload.longitude),
        address_reference=payload.address_reference,
        reported_at=payload.reported_at,
        status=ReportStatus.received,
    )
    db.add(report)
    db.flush()
    process_report_grouping(db, report, payload.latitude, payload.longitude, user.id)
    notify_user(
        db,
        user.id,
        "report_received",
        "Reporte recibido",
        f"Tu reporte {report.public_id} fue registrado.",
        {"report_id": str(report.id)},
    )
    db.commit()
    db.refresh(report)
    return _to_out(db, report, suggestions)


@router.get("/nearby", response_model=list[ReportOut])
def nearby(
    lat: float,
    lon: float,
    radius_m: float | None = None,
    db: Session = Depends(get_db),
):
    radius = radius_m or settings.duplicate_suggest_radius_m
    wkt = f"SRID=4326;POINT({lon} {lat})"
    ids = db.execute(
        text(
            """
            SELECT id FROM reports
            WHERE status <> 'rejected'
            AND ST_DWithin(location, ST_GeogFromText(:wkt), :r)
            ORDER BY ST_Distance(location, ST_GeogFromText(:wkt))
            LIMIT 20
            """
        ),
        {"wkt": wkt, "r": radius},
    ).scalars().all()
    results = []
    for rid in ids:
        report = db.get(Report, rid)
        if report:
            results.append(_to_out(db, report))
    return results


@router.get("", response_model=PaginatedResponse[ReportOut])
def list_reports(
    page: int = 1,
    page_size: int = 20,
    status: ReportStatus | None = None,
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    page_size = min(max(page_size, 1), 100)
    q = select(Report)
    if status:
        q = q.where(Report.status == status)
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    reports = db.scalars(q.order_by(Report.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return PaginatedResponse(
        items=[_to_out(db, r) for r in reports],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: uuid.UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(404, detail="Reporte no encontrado")
    if user.role == UserRole.CIUDADANO and report.user_id != user.id:
        raise HTTPException(403, detail="Sin permiso")
    return _to_out(db, report)


@router.patch("/{report_id}", response_model=ReportOut)
def patch_report(
    report_id: uuid.UUID,
    payload: ReportPatch,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(404, detail="Reporte no encontrado")
    is_admin = user.role in (UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)
    if not is_admin:
        if report.user_id != user.id or report.status not in (ReportStatus.received,):
            raise HTTPException(403, detail="Sin permiso")
        if payload.status:
            raise HTTPException(403, detail="No puede cambiar estado")
        if payload.title:
            report.title = payload.title
        if payload.description:
            report.description = payload.description
    else:
        old = report.status
        if payload.status:
            if payload.status == ReportStatus.rejected and not payload.rejection_reason:
                raise HTTPException(422, detail="Motivo requerido para rechazo")
            report.status = payload.status
            report.rejection_reason = payload.rejection_reason
            notify_user(
                db,
                report.user_id,
                "report_validated" if payload.status == ReportStatus.validated else "report_status_changed",
                "Actualización de reporte",
                f"El reporte {report.public_id} cambió a {payload.status.value}",
                {"from": old.value, "to": payload.status.value},
            )
            if report.incident_id:
                db.add(
                    IncidentHistory(
                        incident_id=report.incident_id,
                        actor_user_id=user.id,
                        event_type="status_changed",
                        payload={"report_id": str(report.id), "from": old.value, "to": payload.status.value},
                    )
                )
        if payload.title:
            report.title = payload.title
        if payload.description:
            report.description = payload.description
    db.commit()
    db.refresh(report)
    return _to_out(db, report)


@router.post("/{report_id}/photos", response_model=ReportPhotoOut, status_code=201)
async def upload_photo(
    report_id: uuid.UUID,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = db.get(Report, report_id)
    if not report or (user.role == UserRole.CIUDADANO and report.user_id != user.id):
        raise HTTPException(404, detail="Reporte no encontrado")
    if report.status == ReportStatus.rejected:
        raise HTTPException(400, detail="Reporte rechazado")
    count = db.scalar(select(func.count()).where(ReportPhoto.report_id == report.id)) or 0
    if count >= 5:
        raise HTTPException(400, detail="Máximo 5 fotografías")
    content = await file.read()
    if len(content) > settings.max_photo_bytes:
        raise HTTPException(413, detail="Archivo demasiado grande")
    mime = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if mime not in settings.allowed_mime_set:
        raise HTTPException(415, detail="MIME no permitido")
    storage_key = f"{report.id}/{uuid.uuid4()}{mimetypes.guess_extension(mime) or '.bin'}"
    dest = Path(settings.photos_path) / storage_key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)
    photo = ReportPhoto(report_id=report.id, storage_key=storage_key, mime_type=mime, size_bytes=len(content))
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return ReportPhotoOut(
        id=str(photo.id), mime_type=photo.mime_type, size_bytes=photo.size_bytes, created_at=photo.created_at
    )


@router.get("/{report_id}/photos/{photo_id}/content")
def get_photo_content(
    report_id: uuid.UUID,
    photo_id: uuid.UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = db.get(Report, report_id)
    photo = db.get(ReportPhoto, photo_id)
    if not report or not photo or photo.report_id != report.id:
        raise HTTPException(404, detail="No encontrado")
    is_admin = user.role in (UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)
    if user.role == UserRole.CIUDADANO and report.user_id != user.id:
        raise HTTPException(403, detail="Sin permiso")
    path = Path(settings.photos_path) / photo.storage_key
    if not path.is_file():
        raise HTTPException(404, detail="Archivo no disponible")
    return FileResponse(path, media_type=photo.mime_type)


@router.get("/{report_id}/history", response_model=list[HistoryItem])
def report_history(report_id: uuid.UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(404, detail="Reporte no encontrado")
    if user.role == UserRole.CIUDADANO and report.user_id != user.id:
        raise HTTPException(403, detail="Sin permiso")
    items: list[HistoryItem] = []
    if report.incident_id:
        rows = db.scalars(
            select(IncidentHistory)
            .where(IncidentHistory.incident_id == report.incident_id)
            .order_by(IncidentHistory.created_at)
        ).all()
        for h in rows:
            payload = h.payload or {}
            if payload.get("report_id") == str(report.id) or h.event_type == "status_changed":
                items.append(
                    HistoryItem(
                        at=h.created_at,
                        type=h.event_type,
                        from_status=payload.get("from"),
                        to_status=payload.get("to"),
                        actor_role=None,
                    )
                )
    return items