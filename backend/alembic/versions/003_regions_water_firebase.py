"""regiones nacionales, indicadores de agua INEGI, Firebase Auth y purga de fotos

- states: 32 entidades con geometría (Marco Geoestadístico).
- municipalities.geom: geography -> geometry + índice GiST (punto-en-polígono a escala nacional).
- water_indicators: Censo 2020 (ITER) por entidad y municipio.
- users.firebase_uid y password_hash opcional (cuentas gestionadas por Firebase Authentication).
- incidents.photos_purged_at: marca cuándo se borraron las fotos al cerrar el caso.

Revision ID: 003
Revises: 002
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "states",
        sa.Column("cve_ent", sa.String(2), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("abbrev", sa.String(20)),
        sa.Column("pob_total", sa.Integer()),
        sa.Column("viviendas_habitadas", sa.Integer()),
        sa.Column("geom", Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=False)),
    )
    op.execute("CREATE INDEX states_geom_gix ON states USING GIST (geom)")

    op.execute("DROP INDEX IF EXISTS idx_municipalities_geom")
    op.execute("DROP INDEX IF EXISTS municipalities_geom_gix")
    op.execute(
        "ALTER TABLE municipalities ALTER COLUMN geom TYPE geometry(MultiPolygon,4326) "
        "USING ST_Multi(geom::geometry)"
    )
    op.execute("CREATE INDEX municipalities_geom_gix ON municipalities USING GIST (geom)")
    op.create_index("ix_municipalities_cve_ent", "municipalities", ["cve_ent"])

    op.create_table(
        "water_indicators",
        sa.Column("cvegeo", sa.String(9), primary_key=True),
        sa.Column("level", sa.String(12), nullable=False),
        sa.Column("viviendas", sa.Integer()),
        sa.Column("con_agua_entubada", sa.Integer()),
        sa.Column("sin_agua_entubada", sa.Integer()),
        sa.Column("con_tinaco", sa.Integer()),
        sa.Column("con_cisterna", sa.Integer()),
        sa.Column("reference_year", sa.Integer(), nullable=False, server_default="2020"),
        sa.CheckConstraint("level IN ('state', 'municipality')", name="water_indicators_level_ck"),
    )

    op.add_column("users", sa.Column("firebase_uid", sa.String(128)))
    op.create_unique_constraint("users_firebase_uid_key", "users", ["firebase_uid"])
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=True)

    op.add_column("incidents", sa.Column("photos_purged_at", sa.DateTime(timezone=True)))


def downgrade() -> None:
    op.drop_column("incidents", "photos_purged_at")
    op.execute("UPDATE users SET password_hash = '!' WHERE password_hash IS NULL")
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=False)
    op.drop_constraint("users_firebase_uid_key", "users", type_="unique")
    op.drop_column("users", "firebase_uid")
    op.drop_table("water_indicators")
    op.drop_index("ix_municipalities_cve_ent", "municipalities")
    op.execute("DROP INDEX IF EXISTS municipalities_geom_gix")
    op.execute("ALTER TABLE municipalities ALTER COLUMN geom TYPE geography(MultiPolygon,4326) USING geom::geography")
    op.execute("DROP INDEX IF EXISTS states_geom_gix")
    op.drop_table("states")
