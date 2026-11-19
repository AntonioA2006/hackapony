"""ubicación pública ofuscada e índice GiST para el bbox del mapa (D5)

`public_location` es el único punto que sale en la API pública. Se rellena con
la misma función que usa la aplicación al crear o mover una incidencia, para
que las filas ya existentes no publiquen el centroide exacto.

Revision ID: 005
Revises: 004
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography

from app.services.public_geo import public_coordinates

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "incidents",
        sa.Column("public_location", Geography(geometry_type="POINT", srid=4326), nullable=True),
    )
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            """
            SELECT id::text AS id,
                   ST_Y(centroid::geometry) AS lat,
                   ST_X(centroid::geometry) AS lon
            FROM incidents
            """
        )
    ).mappings()
    for row in rows:
        lat, lon = public_coordinates(row["lat"], row["lon"], row["id"])
        bind.execute(
            sa.text(
                """
                UPDATE incidents
                SET public_location = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {"lon": lon, "lat": lat, "id": row["id"]},
        )
    op.alter_column("incidents", "public_location", nullable=False)
    op.execute("CREATE INDEX incidents_public_location_gix ON incidents USING GIST (public_location)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS incidents_public_location_gix")
    op.drop_column("incidents", "public_location")
