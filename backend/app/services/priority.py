from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.priority import compute_urgency
from app.models.entities import Incident
from app.services.spatial import fetch_census_pob

settings = get_settings()


def corroboration_confirmation_count(db: Session, incident_id) -> int:
    """Confirmaciones de usuarios que no reportaron la incidencia (H11)."""
    row = db.execute(
        text(
            """
            SELECT COUNT(*) FROM citizen_confirmations cc
            WHERE cc.incident_id = :iid
              AND NOT EXISTS (
                SELECT 1 FROM reports r
                WHERE r.incident_id = cc.incident_id AND r.user_id = cc.user_id
              )
            """
        ),
        {"iid": str(incident_id)},
    ).scalar()
    return int(row or 0)


def recalculate_incident_urgency(db: Session, incident: Incident) -> None:
    pob = fetch_census_pob(db, incident.census_area_id)
    effective_confirmations = corroboration_confirmation_count(db, incident.id)
    breakdown = compute_urgency(
        severity=incident.aggregated_severity,
        report_count=incident.report_count,
        confirmation_count=effective_confirmations,
        pob_total=pob,
        opened_at=incident.opened_at,
        status=incident.status,
        pop_ref=settings.priority_pop_ref,
    )
    incident.urgency_score = breakdown.score
    incident.priority_band = breakdown.band