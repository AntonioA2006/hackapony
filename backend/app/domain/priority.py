import math
from dataclasses import dataclass
from datetime import UTC, datetime

from app.domain.enums import IncidentStatus, LeakFlow, LeakSeverity, PriorityBand


SEVERITY_POINTS = {
    LeakSeverity.low: 10.0,
    LeakSeverity.medium: 22.0,
    LeakSeverity.high: 32.0,
    LeakSeverity.critical: 40.0,
}

FLOW_POINTS = {
    LeakFlow.goteo: 0.0,
    LeakFlow.chorro: 6.0,
    LeakFlow.inundacion: 15.0,
}

BAND_FLOOR_SCORE = {
    PriorityBand.critical: 80.0,
    PriorityBand.high: 60.0,
}


@dataclass(frozen=True)
class UrgencyBreakdown:
    score: float
    band: PriorityBand
    severity_pts: float
    flow_pts: float
    corroboration_pts: float
    territorial_pts: float
    time_pts: float


def band_from_score(score: float) -> PriorityBand:
    if score >= 80:
        return PriorityBand.critical
    if score >= 60:
        return PriorityBand.high
    if score >= 35:
        return PriorityBand.medium
    return PriorityBand.low


def band_floor(severity: LeakSeverity, leak_flow: LeakFlow | None) -> PriorityBand | None:
    """Mínimo garantizado: una fuga crítica o una inundación no puede quedar en media/baja
    por falta de corroboración o de datos censales."""
    critical = severity == LeakSeverity.critical
    flooding = leak_flow == LeakFlow.inundacion
    if critical and flooding:
        return PriorityBand.critical
    if critical or flooding:
        return PriorityBand.high
    return None


def compute_urgency(
    *,
    severity: LeakSeverity,
    report_count: int,
    confirmation_count: int,
    pob_total: int | None,
    opened_at: datetime,
    status: IncidentStatus,
    now: datetime | None = None,
    pop_ref: int = 5000,
    leak_flow: LeakFlow | None = None,
) -> UrgencyBreakdown:
    now = now or datetime.now(UTC)
    if opened_at.tzinfo is None:
        opened_at = opened_at.replace(tzinfo=UTC)

    s = SEVERITY_POINTS.get(severity, 22.0)
    f = FLOW_POINTS.get(leak_flow, 0.0) if leak_flow else 0.0
    r = max(report_count, 0)
    k = max(confirmation_count, 0)
    c = min(30.0, 15.0 * (min(r, 5) / 5.0) + 15.0 * (min(k, 10) / 10.0))

    if pob_total is None or pob_total <= 0:
        i_pts = 0.0
    else:
        i_pts = min(20.0, 20.0 * (math.log(1 + pob_total) / math.log(1 + pop_ref)))

    if status in (IncidentStatus.resolved, IncidentStatus.dismissed):
        end = now
    else:
        end = now
    hours_open = max((end - opened_at).total_seconds() / 3600.0, 0.0)
    t_pts = min(10.0, 10.0 * (min(hours_open, 168.0) / 168.0))

    if status in (IncidentStatus.resolved, IncidentStatus.dismissed):
        u = 0.0
        band = PriorityBand.low
    else:
        u = min(100.0, s + f + c + i_pts + t_pts)
        floor = band_floor(severity, leak_flow)
        if floor is not None:
            u = max(u, BAND_FLOOR_SCORE[floor])
        band = band_from_score(u)

    return UrgencyBreakdown(
        score=round(u, 2),
        band=band,
        severity_pts=round(s, 2),
        flow_pts=round(f, 2),
        corroboration_pts=round(c, 2),
        territorial_pts=round(i_pts, 2),
        time_pts=round(t_pts, 2),
    )