import math
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.enums import LEAK_CATEGORIES, IncidentStatus, LeakSeverity, ReportCategory
from app.models.entities import Incident, IncidentHistory, Report
from app.services.priority import recalculate_incident_urgency
from app.services.spatial import assign_territorial_context, locate, point_wkt
from app.utils.ids import new_public_id

settings = get_settings()


# Bloqueo por celda de malla para serializar el agrupamiento de reportes cercanos (H1).
# La celda debe ser mayor que GROUPING_DISTANCE_M en ambos ejes: 0.01° ≈ 1.1 km de latitud
# y ≥ 0.55 km de longitud hasta latitud 60°, sobrado para radios de decenas de metros.
_GRID_DEG = 0.01
_LOCK_NAMESPACE = 0x4141  # 'AA'; evita colisiones con otros usos de advisory locks


def _grid_cell(lat: float, lon: float) -> tuple[int, int]:
    return math.floor((lat + 90) / _GRID_DEG), math.floor((lon + 180) / _GRID_DEG)


def lock_grouping_area(db: Session, lat: float, lon: float) -> None:
    """Toma advisory locks transaccionales sobre la celda del punto y sus 8 vecinas.

    Dos puntos a menos de una celda de distancia comparten al menos una celda bloqueada,
    así que sus transacciones de agrupamiento se ejecutan en serie. Se adquieren en orden
    creciente para evitar deadlocks. Se liberan solos en COMMIT/ROLLBACK.
    """
    row, col = _grid_cell(lat, lon)
    ncols = math.ceil(360 / _GRID_DEG) + 2
    keys = sorted({(row + dr) * ncols + (col + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1)})
    for key in keys:
        db.execute(text("SELECT pg_advisory_xact_lock(CAST(:ns AS integer), CAST(:key AS integer))"), {"ns": _LOCK_NAMESPACE, "key": key})


def find_nearby_incident(db: Session, lat: float, lon: float, category: ReportCategory) -> Incident | None:
    wkt = f"SRID=4326;POINT({lon} {lat})"
    row = db.execute(
        text(
            """
            SELECT id FROM incidents
            WHERE status NOT IN ('resolved', 'dismissed')
              AND primary_category = :cat
              AND ST_DWithin(centroid, ST_GeogFromText(:wkt), :dist)
            ORDER BY ST_Distance(centroid, ST_GeogFromText(:wkt)), id
            LIMIT 1
            FOR UPDATE
            """
        ),
        {"wkt": wkt, "dist": settings.grouping_distance_m, "cat": category.value},
    ).first()
    if not row:
        return None
    return db.get(Incident, row[0], populate_existing=True)


_SEVERITY_ORDER = ["low", "medium", "high", "critical"]


def recalc_centroid(db: Session, incident: Incident) -> None:
    """Recalcula centroide, conteo, gravedad y contexto territorial en una sola consulta.

    Requiere que los cambios de vinculación ya estén en la BD (flush previo).
    """
    row = db.execute(
        text(
            """
            SELECT ST_Y(c) AS lat, ST_X(c) AS lon, n, severities
            FROM (
                SELECT ST_Centroid(ST_Collect(location::geometry)) AS c,
                       count(*) AS n,
                       array_agg(severity::text) AS severities
                FROM reports
                WHERE incident_id = :iid
            ) agg
            WHERE n > 0
            """
        ),
        {"iid": str(incident.id)},
    ).first()
    if not row:
        return
    incident.centroid = point_wkt(row.lat, row.lon)
    incident.report_count = row.n
    incident.aggregated_severity = LeakSeverity(max(row.severities, key=_SEVERITY_ORDER.index))
    incident.census_area_id, incident.municipality_id = locate(db, row.lat, row.lon)


def link_report_to_incident(
    db: Session,
    report: Report,
    incident: Incident,
    actor_user_id: UUID | None = None,
) -> None:
    report.incident_id = incident.id
    db.flush()  # la sesión no hace autoflush: sin esto recalc_centroid no ve el nuevo vínculo
    recalc_centroid(db, incident)
    recalculate_incident_urgency(db, incident)
    db.add(
        IncidentHistory(
            incident_id=incident.id,
            actor_user_id=actor_user_id,
            event_type="report_linked",
            payload={"report_id": str(report.id)},
        )
    )


def create_incident_for_report(
    db: Session, report: Report, lat: float, lon: float, actor_user_id: UUID | None = None
) -> Incident:
    incident = Incident(
        public_id=new_public_id("INC"),
        status=IncidentStatus.open,
        primary_category=report.category,
        aggregated_severity=report.severity,
        centroid=point_wkt(lat, lon),
        report_count=1,
        confirmation_count=0,
        opened_at=datetime.now(UTC),
        census_area_id=report.census_area_id,
        municipality_id=report.municipality_id,
    )
    db.add(incident)
    db.flush()
    report.incident_id = incident.id
    recalculate_incident_urgency(db, incident)
    db.add(
        IncidentHistory(
            incident_id=incident.id,
            actor_user_id=actor_user_id,
            event_type="report_linked",
            payload={"report_id": str(report.id), "created_incident": True},
        )
    )
    return incident


def process_report_grouping(
    db: Session, report: Report, lat: float, lon: float, actor_user_id: UUID | None = None
) -> Incident | None:
    """Asigna contexto territorial al reporte y lo agrupa en una incidencia.

    Debe ejecutarse dentro de la transacción que crea el reporte; los locks se liberan en el commit.
    """
    assign_territorial_context(db, report, lat, lon)
    if report.category not in LEAK_CATEGORIES:
        return None
    lock_grouping_area(db, lat, lon)
    existing = find_nearby_incident(db, lat, lon, report.category)
    if existing:
        link_report_to_incident(db, report, existing, actor_user_id)
        return existing
    return create_incident_for_report(db, report, lat, lon, actor_user_id)


def nearby_public_suggestions(db: Session, lat: float, lon: float, category: ReportCategory | None = None):
    wkt = f"SRID=4326;POINT({lon} {lat})"
    sql = """
        SELECT id, public_id, primary_category, status::text,
               ST_Y(centroid::geometry) as lat, ST_X(centroid::geometry) as lon,
               ST_Distance(centroid, ST_GeogFromText(:wkt)) as dist
        FROM incidents
        WHERE status NOT IN ('resolved', 'dismissed')
          AND ST_DWithin(centroid, ST_GeogFromText(:wkt), :radius)
    """
    params: dict = {"wkt": wkt, "radius": settings.duplicate_suggest_radius_m}
    if category:
        sql += " AND primary_category = :cat"
        params["cat"] = category.value
    sql += " ORDER BY dist LIMIT 5"
    return db.execute(text(sql), params).mappings().all()