from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.domain.enums import OPERATOR_ROLES, SUPERVISOR_ROLES, IncidentStatus, ReportStatus, UserRole
from app.models.entities import CitizenConfirmation, Incident, Report

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/summary")
def summary(
    user=Depends(require_roles(*OPERATOR_ROLES)),
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
    user=Depends(require_roles(*OPERATOR_ROLES)),
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
    user=Depends(require_roles(*OPERATOR_ROLES)),
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

# ---------------------------------------------------------------- panel del personal

_RATE_SQL = "CASE i.leak_flow WHEN 'goteo' THEN 5 WHEN 'chorro' THEN 600 WHEN 'inundacion' THEN 6000 END"
_HOURS_SQL = "LEAST(EXTRACT(EPOCH FROM (COALESCE(i.closed_at, now()) - i.opened_at)) / 3600, 720)"
_LITERS_SQL = f"({_RATE_SQL}) * {_HOURS_SQL}"


def _scope(cve_ent: str | None) -> tuple[str, dict]:
    """Filtro opcional por entidad (aplica a todas las consultas del panel)."""
    if cve_ent:
        return "AND m.cve_ent = :ent", {"ent": cve_ent.zfill(2)}
    return "", {}


@router.get("/staff-dashboard")
def staff_dashboard(
    cve_ent: str | None = Query(None, pattern=r"^\d{1,2}$"),
    days: int = Query(30, ge=7, le=365),
    user=Depends(require_roles(*OPERATOR_ROLES)),
    db: Session = Depends(get_db),
):
    """Métricas para técnico y supervisión. El desperdicio usa caudales de referencia (app.domain.waste)."""
    where, params = _scope(cve_ent)
    base = f"FROM incidents i LEFT JOIN municipalities m ON m.id = i.municipality_id WHERE TRUE {where}"
    p = {**params, "days": days, "me": str(user.id)}

    totals = db.execute(
        text(
            f"""
            SELECT count(*) AS total,
                   count(*) FILTER (WHERE i.status IN ('open','triaged')) AS open,
                   count(*) FILTER (WHERE i.status = 'in_progress') AS in_progress,
                   count(*) FILTER (WHERE i.status = 'resolved') AS resolved,
                   count(*) FILTER (WHERE i.status = 'dismissed') AS dismissed,
                   count(*) FILTER (WHERE i.status NOT IN ('resolved','dismissed') AND i.assigned_to_id IS NULL) AS unassigned,
                   count(*) FILTER (WHERE i.status NOT IN ('resolved','dismissed') AND i.priority_band = 'critical') AS critical_open,
                   count(*) FILTER (WHERE i.status NOT IN ('resolved','dismissed') AND i.assigned_to_id = :me) AS mine_open,
                   count(*) FILTER (WHERE i.status = 'resolved' AND i.assigned_to_id = :me) AS mine_resolved,
                   avg(EXTRACT(EPOCH FROM (i.closed_at - i.opened_at)) / 3600) FILTER (WHERE i.status = 'resolved') AS avg_resolution_h,
                   COALESCE(sum({_LITERS_SQL}) FILTER (WHERE i.status NOT IN ('resolved','dismissed')), 0) AS liters_open,
                   COALESCE(sum({_LITERS_SQL}) FILTER (WHERE i.status = 'resolved'), 0) AS liters_resolved
            {base}
            """
        ),
        p,
    ).mappings().one()

    def rows(sql: str):
        return [dict(r) for r in db.execute(text(sql), p).mappings().all()]

    by_area = rows(
        f"""
        SELECT {'m.cvegeo AS id, m.name' if cve_ent else 's.cve_ent AS id, s.name'},
               count(*) AS total,
               count(*) FILTER (WHERE i.status NOT IN ('resolved','dismissed')) AS active
        FROM incidents i
        LEFT JOIN municipalities m ON m.id = i.municipality_id
        LEFT JOIN states s ON s.cve_ent = m.cve_ent
        WHERE TRUE {where}
        GROUP BY 1, 2 ORDER BY total DESC LIMIT 12
        """
    )
    grand = sum(r["total"] for r in by_area) or 1
    for r in by_area:
        r["pct"] = round(100 * r["total"] / max(totals["total"] or 1, 1), 1) if totals["total"] else 0
        r["name"] = r["name"] or "Sin región"
    by_category = rows(f"SELECT i.primary_category::text AS key, count(*) AS total {base} GROUP BY 1 ORDER BY 2 DESC")
    by_band = rows(
        f"SELECT i.priority_band::text AS key, count(*) AS total {base} AND i.status NOT IN ('resolved','dismissed') GROUP BY 1"
    )
    by_flow = rows(
        f"""
        SELECT COALESCE(i.leak_flow::text, 'sin_dato') AS key, count(*) AS total,
               COALESCE(round(sum({_LITERS_SQL})::numeric, 0), 0) AS liters
        {base} GROUP BY 1 ORDER BY 2 DESC
        """
    )
    timeline = rows(
        f"""
        WITH d AS (SELECT generate_series((now() - make_interval(days => :days))::date, now()::date, '1 day')::date AS day)
        SELECT d.day,
               (SELECT count(*) FROM incidents i LEFT JOIN municipalities m ON m.id = i.municipality_id
                 WHERE i.opened_at::date = d.day {where}) AS opened,
               (SELECT count(*) FROM incidents i LEFT JOIN municipalities m ON m.id = i.municipality_id
                 WHERE i.status = 'resolved' AND i.closed_at::date = d.day {where}) AS resolved
        FROM d ORDER BY d.day
        """
    )
    for r in timeline:
        r["day"] = r["day"].isoformat()
    for coll in (by_flow,):
        for r in coll:
            r["liters"] = float(r["liters"])
    return {
        "scope": {"cve_ent": cve_ent.zfill(2) if cve_ent else None, "days": days},
        "totals": {k: (float(v) if k.startswith(("avg", "liters")) and v is not None else v) for k, v in totals.items()},
        "by_area": by_area,
        "by_category": by_category,
        "by_band": by_band,
        "by_flow": by_flow,
        "timeline": timeline,
        "flow_rates_lph": {"goteo": 5, "chorro": 600, "inundacion": 6000},
        "grand_total": grand,
    }


@router.get("/incidents-by-region")
def incidents_by_region(
    cve_ent: str | None = Query(None, pattern=r"^\d{1,2}$"),
    user=Depends(require_roles(*OPERATOR_ROLES)),
    db: Session = Depends(get_db),
):
    """Incidencias activas por región para colorear el mapa del personal (estados o municipios de un estado).
    Las resueltas o descartadas no cuentan: al cerrarse, la región se va aclarando."""
    level_id = "m.cvegeo" if cve_ent else "m.cve_ent"
    where, params = _scope(cve_ent)
    data = db.execute(
        text(
            f"""
            SELECT {level_id} AS id,
                   count(*) AS active,
                   count(*) FILTER (WHERE i.priority_band = 'critical') AS critical,
                   count(*) FILTER (WHERE i.priority_band = 'high') AS high,
                   count(*) FILTER (WHERE i.priority_band = 'medium') AS medium,
                   count(*) FILTER (WHERE i.priority_band = 'low') AS low
            FROM incidents i JOIN municipalities m ON m.id = i.municipality_id
            WHERE i.status NOT IN ('resolved','dismissed') {where}
            GROUP BY 1
            """
        ),
        params,
    ).mappings().all()
    return {"level": "municipality" if cve_ent else "state", "items": [dict(r) for r in data]}
