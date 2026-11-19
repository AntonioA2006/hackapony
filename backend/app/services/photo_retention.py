"""Retención de fotografías: se eliminan al cerrar la incidencia (resuelta o descartada).

Motivo: las fotos solo sirven para validar y atender el caso; conservarlas después satura el
almacenamiento gratuito y prolonga la custodia de imágenes que pueden contener a terceros.
Lo que se conserva para auditoría es el hecho: cuántas fotos hubo, cuándo y quién cerró el caso
(evento `photos_purged` en `incident_history`).
"""
import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.storage import get_storage
from app.domain.enums import IncidentStatus
from app.models.entities import Incident, IncidentHistory, Report, ReportPhoto

log = logging.getLogger(__name__)

CLOSED_STATUSES = (IncidentStatus.resolved, IncidentStatus.dismissed)


def purge_incident_photos(db: Session, incident: Incident, actor_user_id: UUID | None) -> int:
    """Borra del almacenamiento y de la BD las fotos de todos los reportes de la incidencia.

    Se borran primero los archivos y después las filas, dentro de la transacción del cambio de estado.
    Si un archivo no se puede borrar, su fila se conserva para reintentarlo en el siguiente cierre o job.
    """
    photos = db.scalars(
        select(ReportPhoto).join(Report, Report.id == ReportPhoto.report_id).where(Report.incident_id == incident.id)
    ).all()
    storage = get_storage()
    deleted_ids = []
    for photo in photos:
        try:
            storage.delete(photo.storage_key)
            deleted_ids.append(photo.id)
        except Exception:  # noqa: BLE001 — se registra y se reintenta después
            log.exception("No se pudo borrar la foto %s (%s)", photo.id, photo.storage_key)
    if deleted_ids:
        db.execute(delete(ReportPhoto).where(ReportPhoto.id.in_(deleted_ids)))
    incident.photos_purged_at = datetime.now(UTC)
    db.add(
        IncidentHistory(
            incident_id=incident.id,
            actor_user_id=actor_user_id,
            event_type="photos_purged",
            payload={"deleted": len(deleted_ids), "failed": len(photos) - len(deleted_ids)},
        )
    )
    return len(deleted_ids)


def purge_report_photos(db: Session, report: Report, actor_user_id: UUID | None) -> int:
    """Borra las fotos de un reporte rechazado (o resuelto sin incidencia, p. ej. `supply_issue`)."""
    photos = db.scalars(select(ReportPhoto).where(ReportPhoto.report_id == report.id)).all()
    storage = get_storage()
    deleted = 0
    for photo in photos:
        try:
            storage.delete(photo.storage_key)
            db.delete(photo)
            deleted += 1
        except Exception:  # noqa: BLE001
            log.exception("No se pudo borrar la foto %s (%s)", photo.id, photo.storage_key)
    return deleted
