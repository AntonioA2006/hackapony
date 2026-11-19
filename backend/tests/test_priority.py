from datetime import UTC, datetime, timedelta

from app.domain.enums import IncidentStatus, LeakSeverity
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