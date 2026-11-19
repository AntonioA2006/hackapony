import uuid
from datetime import datetime

from geoalchemy2 import Geography, Geometry
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.domain.enums import (
    LeakFlow,
    IncidentStatus,
    LeakSeverity,
    PriorityBand,
    ReportCategory,
    ReportStatus,
    UserRole,
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    # Nulo para cuentas de Firebase Authentication (la contraseña la gestiona Firebase)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    firebase_uid: Mapped[str | None] = mapped_column(String(128), unique=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), default=UserRole.CIUDADANO)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reports: Mapped[list["Report"]] = relationship(back_populates="user")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    public_id: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    incident_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("incidents.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[ReportCategory] = mapped_column(Enum(ReportCategory, name="report_category"))
    severity: Mapped[LeakSeverity] = mapped_column(Enum(LeakSeverity, name="leak_severity"))
    location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    address_reference: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"), default=ReportStatus.received
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    leak_flow: Mapped[LeakFlow | None] = mapped_column(Enum(LeakFlow, name="leak_flow", create_type=False))
    contact_phone: Mapped[str | None] = mapped_column(String(15))
    municipality_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("municipalities.id"))
    census_area_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("census_areas.id"))
    reported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="reports")
    incident: Mapped["Incident | None"] = relationship(back_populates="reports")
    photos: Mapped[list["ReportPhoto"]] = relationship(back_populates="report")


class ReportPhoto(Base):
    __tablename__ = "report_photos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), index=True)
    storage_key: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    report: Mapped["Report"] = relationship(back_populates="photos")


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    public_id: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    status: Mapped[IncidentStatus] = mapped_column(Enum(IncidentStatus, name="incident_status"), default=IncidentStatus.open)
    primary_category: Mapped[ReportCategory] = mapped_column(
        Enum(ReportCategory, name="report_category", create_type=False),
    )
    aggregated_severity: Mapped[LeakSeverity] = mapped_column(
        Enum(LeakSeverity, name="leak_severity", create_type=False),
    )
    centroid: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    # Punto que ve el mapa público (snap ~30 m + jitter HMAC). El centroide real queda para operación.
    public_location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    report_count: Mapped[int] = mapped_column(Integer, default=0)
    confirmation_count: Mapped[int] = mapped_column(Integer, default=0)
    urgency_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    priority_band: Mapped[PriorityBand] = mapped_column(Enum(PriorityBand, name="priority_band"), default=PriorityBand.low)
    municipality_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("municipalities.id"))
    census_area_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("census_areas.id"))
    photos_purged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    leak_flow: Mapped[LeakFlow | None] = mapped_column(Enum(LeakFlow, name="leak_flow", create_type=False))
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reports: Mapped[list["Report"]] = relationship(back_populates="incident")
    confirmations: Mapped[list["CitizenConfirmation"]] = relationship(back_populates="incident")
    history: Mapped[list["IncidentHistory"]] = relationship(back_populates="incident")


class IncidentRating(Base):
    """Satisfacción de cualquier usuario autenticado sobre una incidencia (1 a 5)."""

    __tablename__ = "incident_ratings"
    __table_args__ = (UniqueConstraint("incident_id", "user_id", name="incident_ratings_unique"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CitizenConfirmation(Base):
    __tablename__ = "citizen_confirmations"
    __table_args__ = (UniqueConstraint("incident_id", "user_id", name="citizen_confirmations_unique"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident: Mapped["Incident"] = relationship(back_populates="confirmations")


class IncidentHistory(Base):
    __tablename__ = "incident_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), index=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident: Mapped["Incident"] = relationship(back_populates="history")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSONB)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Municipality(Base):
    __tablename__ = "municipalities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cve_ent: Mapped[str] = mapped_column(String(2), nullable=False)
    cve_mun: Mapped[str] = mapped_column(String(3), nullable=False)
    cvegeo: Mapped[str] = mapped_column(String(9), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    geom: Mapped[object | None] = mapped_column(Geometry(geometry_type="MULTIPOLYGON", srid=4326))
    pob_total: Mapped[int | None] = mapped_column(Integer)


class State(Base):
    __tablename__ = "states"

    cve_ent: Mapped[str] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    abbrev: Mapped[str | None] = mapped_column(String(20))
    pob_total: Mapped[int | None] = mapped_column(Integer)
    viviendas_habitadas: Mapped[int | None] = mapped_column(Integer)
    geom: Mapped[object | None] = mapped_column(Geometry(geometry_type="MULTIPOLYGON", srid=4326))


class WaterIndicator(Base):
    """Disponibilidad de agua en viviendas, INEGI Censo 2020 (ITER), por entidad o municipio."""

    __tablename__ = "water_indicators"

    cvegeo: Mapped[str] = mapped_column(String(9), primary_key=True)
    level: Mapped[str] = mapped_column(String(12), nullable=False)
    viviendas: Mapped[int | None] = mapped_column(Integer)
    con_agua_entubada: Mapped[int | None] = mapped_column(Integer)
    sin_agua_entubada: Mapped[int | None] = mapped_column(Integer)
    con_tinaco: Mapped[int | None] = mapped_column(Integer)
    con_cisterna: Mapped[int | None] = mapped_column(Integer)
    reference_year: Mapped[int] = mapped_column(Integer, default=2020)


class CensusArea(Base):
    __tablename__ = "census_areas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    municipality_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("municipalities.id"))
    cvegeo: Mapped[str] = mapped_column(String(13), unique=True, nullable=False)
    cve_ent: Mapped[str] = mapped_column(String(2), nullable=False)
    cve_mun: Mapped[str] = mapped_column(String(3), nullable=False)
    cve_ageb: Mapped[str] = mapped_column(String(4), nullable=False)
    ambito: Mapped[str | None] = mapped_column(String(20))
    geom: Mapped[object | None] = mapped_column(Geometry(geometry_type="MULTIPOLYGON", srid=4326))
    pob_total: Mapped[int | None] = mapped_column(Integer)
    viviendas_habitadas: Mapped[int | None] = mapped_column(Integer)


class InegiIndicator(Base):
    __tablename__ = "inegi_indicators"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    municipality_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("municipalities.id"), index=True)
    dataset_code: Mapped[str] = mapped_column(String(64), nullable=False)
    variable_code: Mapped[str] = mapped_column(String(64), nullable=False)
    variable_label: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[float | None] = mapped_column(Numeric(18, 4))
    unit: Mapped[str | None] = mapped_column(String(32))
    reference_year: Mapped[int | None] = mapped_column(Integer)
    import_run_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("data_import_runs.id"))


class DataSourceCatalog(Base):
    __tablename__ = "data_source_catalog"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    official_name: Mapped[str] = mapped_column(String(255), nullable=False)
    institution: Mapped[str] = mapped_column(String(120), nullable=False)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DataImportRun(Base):
    __tablename__ = "data_import_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("data_source_catalog.id"))
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stats: Mapped[dict | None] = mapped_column(JSONB)
    error_message: Mapped[str | None] = mapped_column(Text)