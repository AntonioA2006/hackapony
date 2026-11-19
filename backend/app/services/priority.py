from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.priority import compute_urgency
from app.models.entities import Incident
from app.services.spatial import fetch_census_pob

settings = get_settings()


def recalculate_incident_urgency(db: Session, incident: Incident) -> None:
    pob = fetch_census_pob(db, incident.census_area_id)
    breakdown = compute_urgency(
        severity=incident.aggregated_severity,
        report_count=incident.report_count,
        confirmation_count=incident.confirmation_count,
        pob_total=pob,
        opened_at=incident.opened_at,
        status=incident.status,
        pop_ref=settings.priority_pop_ref,
    )
    incident.urgency_score = breakdown.score
    incident.priority_band = breakdown.band