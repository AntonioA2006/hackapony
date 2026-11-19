import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.enums import IncidentStatus, LeakFlow, LeakSeverity, PriorityBand, ReportCategory


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
    validated: bool = False  # al menos un reporte validado por personal
    awaiting_validation: bool = False  # compatibilidad: ningún reporte validado todavía
    leak_flow: LeakFlow | None = None
    state_name: str | None = None
    municipality_name: str | None = None
    opened_at: datetime | None = None


class AssigneeOut(BaseModel):
    id: str
    display_name: str


class IncidentOut(PublicIncidentOut):
    updated_at: datetime
    aggregated_severity: LeakSeverity
    municipality_id: str | None = None
    cve_ent: str | None = None
    cvegeo: str | None = None
    closed_at: datetime | None = None
    assigned_to: AssigneeOut | None = None
    estimated_liters: float | None = None


class IncidentPatch(BaseModel):
    status: IncidentStatus | None = None
    aggregated_severity: LeakSeverity | None = None
    leak_flow: LeakFlow | None = None
    # Supervisión: asignar a un técnico concreto. Técnico: solo `assign_to_me` / `unassign`.
    assigned_to_id: uuid.UUID | None = None
    assign_to_me: bool = False
    unassign: bool = False
    # Solo aplica si la incidencia ya tiene un reporte validado. No sustituye esa validación.
    validate_reports: bool = False


class UrgencyBreakdownOut(BaseModel):
    score: float
    band: PriorityBand
    severity_pts: float
    flow_pts: float = 0.0
    corroboration_pts: float
    territorial_pts: float
    time_pts: float


class ConfirmResponse(BaseModel):
    confirmation_count: int


class SatisfactionIn(BaseModel):
    score: int = Field(ge=1, le=5)


class SatisfactionOut(BaseModel):
    score: int
    satisfaction_avg: float | None
