from datetime import datetime

from pydantic import BaseModel

from app.domain.enums import IncidentStatus, LeakSeverity, PriorityBand, ReportCategory


class PublicIncidentOut(BaseModel):
    id: str
    public_id: str
    primary_category: ReportCategory
    status: IncidentStatus
    urgency_score: float
    priority_band: PriorityBand
    latitude: float
    longitude: float
    report_count: int
    confirmation_count: int
    awaiting_validation: bool = False


class IncidentOut(PublicIncidentOut):
    opened_at: datetime
    updated_at: datetime
    aggregated_severity: LeakSeverity
    municipality_id: str | None = None


class IncidentPatch(BaseModel):
    status: IncidentStatus | None = None
    aggregated_severity: LeakSeverity | None = None


class UrgencyBreakdownOut(BaseModel):
    score: float
    band: PriorityBand
    severity_pts: float
    corroboration_pts: float
    territorial_pts: float
    time_pts: float


class ConfirmResponse(BaseModel):
    confirmation_count: int