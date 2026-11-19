from datetime import UTC, datetime
from uuid import UUID

from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.enums import LEAK_CATEGORIES, IncidentStatus, ReportCategory, ReportStatus
from app.models.entities import Incident, IncidentHistory, Report
from app.services.priority import recalculate_incident_urgency
from app.services.spatial import assign_territorial_context, point_wkt
from app.utils.ids import new_public_id

settings = get_settings()


def find_nearby_incident(db: Session, lat: float, lon: float, category: ReportCategory) -> Incident | None:
    wkt = f"SRID=4326;POINT({lon} {lat})"
    row = db.execute(
        text(
            """
            SELECT id FROM incidents
            WHERE status NOT IN ('resolved', 'dismissed')
              AND primary_category = :cat
              AND ST_DWithin(centroid, ST_GeogFromText(:wkt), :dist)
            ORDER BY ST_Distance(centroid, ST_GeogFromText(:wkt))
            LIMIT 1
            """
        ),
        {"wkt": wkt, "dist": settings.grouping_distance_m, "cat": category.value},
    ).first()
    if not row:
        return None
    return db.get(Incident, row[0])


def recalc_centroid(db: Session, incident: Incident) -> None:
    reports = db.scalars(select(Report).where(Report.incident_id == incident.id)).all()
    if not reports:
        return
    coords: list[tuple[float, float]] = []
    for r in reports:
        row = db.execute(
            text("SELECT ST_X(location::geometry), ST_Y(location::geometry) FROM reports WHERE id = :id"),
            {"id": str(r.id)},
        ).one()
        coords.append((row[0], row[1]))
    avg_lon = sum(c[0] for c in coords) / len(coords)
    avg_lat = sum(c[1] for c in coords) / len(coords)
    incident.centroid = point_wkt(avg_lat, avg_lon)
    incident.report_count = len(reports)
    max_severity = max((r.severity for r in reports), key=lambda s: ["low", "medium", "high", "critical"].index(s.value))
    incident.aggregated_severity = max_severity


def link_report_to_incident(
    db: Session,
    report: Report,
    incident: Incident,
    actor_user_id: UUID | None = None,
) -> None:
    report.incident_id = incident.id
    recalc_centroid(db, incident)
    assign_territorial_context(db, report.id, *_lat_lon_from_report(db, report.id))
    recalculate_incident_urgency(db, incident)
    history = IncidentHistory(
        incident_id=incident.id,
        actor_user_id=actor_user_id,
        event_type="report_linked",
        payload={"report_id": str(report.id)},
    )
    db.add(history)


def _lat_lon_from_report(db: Session, report_id: UUID) -> tuple[float, float]:
    row = db.execute(
        text("SELECT ST_Y(location::geometry), ST_X(location::geometry) FROM reports WHERE id = :id"),
        {"id": str(report_id)},
    ).one()
    return row[0], row[1]


def create_incident_for_report(db: Session, report: Report, actor_user_id: UUID | None = None) -> Incident:
    lat, lon = _lat_lon_from_report(db, report.id)
    incident = Incident(
        public_id=new_public_id("INC"),
        status=IncidentStatus.open,
        primary_category=report.category,
        aggregated_severity=report.severity,
        centroid=point_wkt(lat, lon),
        report_count=1,
        confirmation_count=0,
        opened_at=datetime.now(UTC),
    )
    db.add(incident)
    db.flush()
    report.incident_id = incident.id
    assign_territorial_context(db, report.id, lat, lon)
    db.refresh(incident)
    incident.municipality_id = report.municipality_id
    incident.census_area_id = report.census_area_id
    recalculate_incident_urgency(db, incident)
    history = IncidentHistory(
        incident_id=incident.id,
        actor_user_id=actor_user_id,
        event_type="report_linked",
        payload={"report_id": str(report.id), "created_incident": True},
    )
    db.add(history)
    return incident


def process_report_grouping(db: Session, report: Report, actor_user_id: UUID | None = None) -> Incident | None:
    if report.category not in LEAK_CATEGORIES:
        return None
    lat, lon = _lat_lon_from_report(db, report.id)
    existing = find_nearby_incident(db, lat, lon, report.category)
    if existing:
        link_report_to_incident(db, report, existing, actor_user_id)
        return existing
    return create_incident_for_report(db, report, actor_user_id)


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