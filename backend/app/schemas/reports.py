from datetime import UTC, datetime, timedelta

from pydantic import BaseModel, Field, field_validator, model_validator

from app.domain.enums import LeakFlow, LeakSeverity, ReportCategory, ReportStatus


# Rectángulo que contiene a México (incluye islas); el polígono exacto se valida en el servicio.
MX_LAT = (14.0, 33.5)
MX_LON = (-118.5, -86.5)


class ReportCreate(BaseModel):
    title: str = Field(min_length=5, max_length=120)
    description: str = Field(min_length=10, max_length=2000)
    category: ReportCategory
    severity: LeakSeverity = LeakSeverity.medium
    latitude: float = Field(ge=MX_LAT[0], le=MX_LAT[1], description="Solo dentro de México")
    longitude: float = Field(ge=MX_LON[0], le=MX_LON[1], description="Solo dentro de México")
    address_reference: str | None = Field(default=None, max_length=500)
    reported_at: datetime | None = None
    leak_flow: LeakFlow | None = Field(default=None, description="goteo | chorro | inundacion")
    contact_phone: str | None = Field(default=None, description="10 dígitos (México); solo lo ve el personal")

    @field_validator("contact_phone", mode="before")
    @classmethod
    def _phone(cls, v):
        if v in (None, ""):
            return None
        digits = "".join(ch for ch in str(v) if ch.isdigit())
        if digits.startswith("52") and len(digits) == 12:
            digits = digits[2:]
        if len(digits) != 10:
            raise ValueError("El teléfono debe tener 10 dígitos")
        return digits

    @field_validator("title", "description", "address_reference", mode="before")
    @classmethod
    def _clean_text(cls, v):
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("Debe ser texto")
        v = " ".join(v.split())  # colapsa espacios y saltos repetidos
        return v or None

    @field_validator("reported_at")
    @classmethod
    def _not_in_future(cls, v: datetime | None):
        if v is None:
            return v
        now = datetime.now(v.tzinfo or UTC)
        if v > now + timedelta(minutes=5):
            raise ValueError("La fecha del reporte no puede estar en el futuro")
        if v < now - timedelta(days=365):
            raise ValueError("La fecha del reporte es demasiado antigua")
        return v


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
    leak_flow: LeakFlow | None = None
    incident_status: str | None = None
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