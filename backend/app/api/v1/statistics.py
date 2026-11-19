from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.domain.enums import IncidentStatus, ReportStatus, UserRole
from app.models.entities import CitizenConfirmation, Incident, Report

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/summary")
def summary(
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    open_incidents = db.scalar(
        select(func.count()).where(Incident.status.notin_([IncidentStatus.resolved, IncidentStatus.dismissed]))
    )
    reports_7d = db.scalar(
        select(func.count()).where(Report.created_at >= func.now() - text("interval '7 days'"))
    )
    avg_urgency = db.scalar(
        select(func.avg(Incident.urgency_score)).where(
            Incident.status.notin_([IncidentStatus.resolved, IncidentStatus.dismissed])
        )
    )
    confirmations_7d = db.scalar(
        select(func.count()).where(CitizenConfirmation.created_at >= func.now() - text("interval '7 days'"))
    )
    return {
        "open_incidents": int(open_incidents or 0),
        "reports_last_7d": int(reports_7d or 0),
        "avg_urgency_open": float(avg_urgency or 0),
        "confirmations_last_7d": int(confirmations_7d or 0),
    }


@router.get("/citizen-dashboard")
def citizen_dashboard(user=Depends(get_current_user), db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).where(Report.user_id == user.id)) or 0
    pending = db.scalar(
        select(func.count()).where(
            Report.user_id == user.id,
            Report.status.in_([ReportStatus.received, ReportStatus.under_review, ReportStatus.validated]),
        )
    ) or 0
    in_progress = db.scalar(
        select(func.count()).where(Report.user_id == user.id, Report.status == ReportStatus.in_progress)
    ) or 0
    resolved = db.scalar(
        select(func.count()).where(Report.user_id == user.id, Report.status == ReportStatus.resolved)
    ) or 0
    return {
        "total_reports": int(total),
        "pending": int(pending),
        "in_progress": int(in_progress),
        "resolved": int(resolved),
    }


@router.get("/incidents-by-municipality")
def by_municipality(
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(
            """
            SELECT m.cvegeo, m.name, COUNT(i.id) AS cnt
            FROM incidents i
            LEFT JOIN municipalities m ON m.id = i.municipality_id
            GROUP BY m.cvegeo, m.name
            ORDER BY cnt DESC
            """
        )
    ).mappings().all()
    return [{"cvegeo": r["cvegeo"], "name": r["name"], "count": int(r["cnt"] or 0)} for r in rows]


@router.get("/geographic-distribution")
def geo_distribution(
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(
            """
            SELECT ST_X(centroid::geometry) AS lon, ST_Y(centroid::geometry) AS lat, COUNT(*) AS cnt
            FROM incidents
            WHERE status NOT IN ('resolved','dismissed')
            GROUP BY ST_SnapToGrid(centroid::geometry, 0.01)
            LIMIT 500
            """
        )
    ).mappings().all()
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(r["lon"]), float(r["lat"])]},
            "properties": {"count": int(r["cnt"])},
        }
        for r in rows
    ]
    return {"type": "FeatureCollection", "features": features}