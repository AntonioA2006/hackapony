from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.domain.enums import LeakSeverity, ReportCategory, ReportStatus


class ReportCreate(BaseModel):
    title: str = Field(min_length=5, max_length=120)
    description: str = Field(min_length=10, max_length=2000)
    category: ReportCategory
    severity: LeakSeverity = LeakSeverity.medium
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address_reference: str | None = Field(default=None, max_length=500)
    reported_at: datetime | None = None


class NearbySuggestion(BaseModel):
    incident_id: str
    public_id: str
    distance_m: float


class ReportOut(BaseModel):
    id: str
    public_id: str
    status: ReportStatus
    title: str
    description: str
    category: ReportCategory
    severity: LeakSeverity
    latitude: float
    longitude: float
    address_reference: str | None
    incident_id: str | None
    created_at: datetime
    reported_at: datetime | None
    nearby_suggestions: list[NearbySuggestion] = Field(default_factory=list)


class ReportCreateResponse(ReportOut):
    pass


class ReportPhotoOut(BaseModel):
    id: str
    mime_type: str
    size_bytes: int
    created_at: datetime


class ReportPatch(BaseModel):
    status: ReportStatus | None = None
    rejection_reason: str | None = None
    title: str | None = Field(default=None, min_length=5, max_length=120)
    description: str | None = Field(default=None, min_length=10, max_length=2000)

    @model_validator(mode="after")
    def reason_when_rejected(self):
        if self.status == ReportStatus.rejected and not self.rejection_reason:
            raise ValueError("rejection_reason requerido")
        return self


class HistoryItem(BaseModel):
    at: datetime
    type: str
    from_status: str | None = None
    to_status: str | None = None
    actor_role: str | None = None