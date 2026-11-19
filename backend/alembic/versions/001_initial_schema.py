"""initial schema

Revision ID: 001
Revises:
Create Date: 2025-11-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography, Geometry
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    user_role = postgresql.ENUM("CIUDADANO", "ADMINISTRADOR", "SUPERADMINISTRADOR", name="user_role", create_type=False)
    report_category = postgresql.ENUM(
        "leak_public_road",
        "broken_pipe",
        "public_infra_leak",
        "flood_from_leak",
        "supply_issue",
        "other_water",
        name="report_category",
        create_type=False,
    )
    leak_severity = postgresql.ENUM("low", "medium", "high", "critical", name="leak_severity", create_type=False)
    report_status = postgresql.ENUM(
        "received",
        "under_review",
        "validated",
        "in_progress",
        "resolved",
        "rejected",
        name="report_status",
        create_type=False,
    )
    incident_status = postgresql.ENUM(
        "open", "triaged", "in_progress", "resolved", "dismissed", name="incident_status", create_type=False
    )
    priority_band = postgresql.ENUM("critical", "high", "medium", "low", name="priority_band", create_type=False)

    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    report_category.create(bind, checkfirst=True)
    leak_severity.create(bind, checkfirst=True)
    report_status.create(bind, checkfirst=True)
    incident_status.create(bind, checkfirst=True)
    priority_band.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="CIUDADANO"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "data_source_catalog",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("source_key", sa.String(64), nullable=False),
        sa.Column("official_name", sa.String(255), nullable=False),
        sa.Column("institution", sa.String(120), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("last_verified_at", sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_key"),
    )

    op.create_table(
        "data_import_runs",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("source_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("stats", postgresql.JSONB()),
        sa.Column("error_message", sa.Text()),
        sa.ForeignKeyConstraint(["source_id"], ["data_source_catalog.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "municipalities",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("cve_ent", sa.String(2), nullable=False),
        sa.Column("cve_mun", sa.String(3), nullable=False),
        sa.Column("cvegeo", sa.String(9), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("geom", Geography(geometry_type="MULTIPOLYGON", srid=4326)),
        sa.Column("pob_total", sa.Integer()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cvegeo"),
    )

    op.create_table(
        "census_areas",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("municipality_id", sa.UUID()),
        sa.Column("cvegeo", sa.String(13), nullable=False),
        sa.Column("cve_ent", sa.String(2), nullable=False),
        sa.Column("cve_mun", sa.String(3), nullable=False),
        sa.Column("cve_ageb", sa.String(4), nullable=False),
        sa.Column("ambito", sa.String(20)),
        sa.Column("geom", Geometry(geometry_type="MULTIPOLYGON", srid=4326)),
        sa.Column("pob_total", sa.Integer()),
        sa.Column("viviendas_habitadas", sa.Integer()),
        sa.ForeignKeyConstraint(["municipality_id"], ["municipalities.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cvegeo"),
    )

    op.create_table(
        "incidents",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("public_id", sa.String(16), nullable=False),
        sa.Column("status", incident_status, nullable=False, server_default="open"),
        sa.Column("primary_category", report_category, nullable=False),
        sa.Column("aggregated_severity", leak_severity, nullable=False),
        sa.Column("centroid", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("report_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("confirmation_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("urgency_score", sa.Numeric(5, 2), server_default="0", nullable=False),
        sa.Column("priority_band", priority_band, server_default="low", nullable=False),
        sa.Column("municipality_id", sa.UUID()),
        sa.Column("census_area_id", sa.UUID()),
        sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["census_area_id"], ["census_areas.id"]),
        sa.ForeignKeyConstraint(["municipality_id"], ["municipalities.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_id"),
    )
    op.execute("CREATE INDEX incidents_centroid_gix ON incidents USING GIST (centroid)")

    op.create_table(
        "reports",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("public_id", sa.String(16), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("incident_id", sa.UUID()),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", report_category, nullable=False),
        sa.Column("severity", leak_severity, nullable=False),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("address_reference", sa.String(500)),
        sa.Column("status", report_status, server_default="received", nullable=False),
        sa.Column("rejection_reason", sa.Text()),
        sa.Column("municipality_id", sa.UUID()),
        sa.Column("census_area_id", sa.UUID()),
        sa.Column("reported_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["census_area_id"], ["census_areas.id"]),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"]),
        sa.ForeignKeyConstraint(["municipality_id"], ["municipalities.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_id"),
    )
    op.execute("CREATE INDEX reports_location_gix ON reports USING GIST (location)")

    op.create_table(
        "report_photos",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("report_id", sa.UUID(), nullable=False),
        sa.Column("storage_key", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "citizen_confirmations",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("incident_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("incident_id", "user_id", name="citizen_confirmations_unique"),
    )

    op.create_table(
        "incident_history",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("incident_id", sa.UUID(), nullable=False),
        sa.Column("actor_user_id", sa.UUID()),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("payload", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(64), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB()),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "inegi_indicators",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("municipality_id", sa.UUID(), nullable=False),
        sa.Column("dataset_code", sa.String(64), nullable=False),
        sa.Column("variable_code", sa.String(64), nullable=False),
        sa.Column("variable_label", sa.String(255), nullable=False),
        sa.Column("value", sa.Numeric(18, 4)),
        sa.Column("unit", sa.String(32)),
        sa.Column("reference_year", sa.Integer()),
        sa.Column("import_run_id", sa.UUID()),
        sa.ForeignKeyConstraint(["import_run_id"], ["data_import_runs.id"]),
        sa.ForeignKeyConstraint(["municipality_id"], ["municipalities.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("inegi_indicators")
    op.drop_table("notifications")
    op.drop_table("incident_history")
    op.drop_table("citizen_confirmations")
    op.drop_table("report_photos")
    op.drop_table("reports")
    op.drop_table("incidents")
    op.drop_table("census_areas")
    op.drop_table("municipalities")
    op.drop_table("data_import_runs")
    op.drop_table("data_source_catalog")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
    for name in ("priority_band", "incident_status", "report_status", "leak_severity", "report_category", "user_role"):
        op.execute(f"DROP TYPE IF EXISTS {name}")