from datetime import UTC, datetime, timedelta

from app.domain.enums import IncidentStatus, LeakFlow, LeakSeverity
from app.domain.priority import compute_urgency


def test_priority_golden_high():
    opened = datetime.now(UTC) - timedelta(hours=36)
    breakdown = compute_urgency(
        severity=LeakSeverity.high,
        report_count=3,
        confirmation_count=4,
        pob_total=2500,
        opened_at=opened,
        status=IncidentStatus.open,
        pop_ref=5000,
    )
    assert 65 <= breakdown.score <= 68
    assert breakdown.band.value == "high"


def test_priority_resolved_zero():
    opened = datetime.now(UTC) - timedelta(days=2)
    breakdown = compute_urgency(
        severity=LeakSeverity.critical,
        report_count=10,
        confirmation_count=10,
        pob_total=10000,
        opened_at=opened,
        status=IncidentStatus.resolved,
    )
    assert breakdown.score == 0.0

def _fresh(severity, leak_flow):
    return compute_urgency(
        severity=severity,
        report_count=3,
        confirmation_count=0,
        pob_total=None,
        opened_at=datetime.now(UTC),
        status=IncidentStatus.open,
        leak_flow=leak_flow,
    )


def test_critical_flooding_is_never_medium():
    assert _fresh(LeakSeverity.critical, LeakFlow.inundacion).band.value == "critical"
    assert _fresh(LeakSeverity.critical, None).band.value == "high"
    assert _fresh(LeakSeverity.medium, LeakFlow.inundacion).band.value == "high"


def test_flow_adds_points():
    goteo = _fresh(LeakSeverity.medium, LeakFlow.goteo)
    chorro = _fresh(LeakSeverity.medium, LeakFlow.chorro)
    assert chorro.flow_pts == 6.0 and chorro.score == goteo.score + 6.0
