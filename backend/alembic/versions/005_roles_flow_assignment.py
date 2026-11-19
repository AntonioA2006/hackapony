"""rol TECNICO, tipo de fuga (goteo/chorro/inundación), asignación y cierre de incidencias

Revision ID: 005
Revises: 004
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ADD VALUE no puede usarse dentro de la misma transacción en la que se crea; va en bloque autocommit.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TECNICO' BEFORE 'ADMINISTRADOR'")

    leak_flow = postgresql.ENUM("goteo", "chorro", "inundacion", name="leak_flow")
    leak_flow.create(op.get_bind(), checkfirst=True)
    op.add_column("reports", sa.Column("leak_flow", postgresql.ENUM(name="leak_flow", create_type=False)))
    op.add_column("incidents", sa.Column("leak_flow", postgresql.ENUM(name="leak_flow", create_type=False)))
    op.add_column("incidents", sa.Column("assigned_to_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")))
    op.add_column("incidents", sa.Column("closed_at", sa.DateTime(timezone=True)))
    op.create_index("ix_incidents_assigned_to_id", "incidents", ["assigned_to_id"])
    op.create_index("ix_incidents_status", "incidents", ["status"])
    # Incidencias ya cerradas: su fecha de cierre aproximada es la última actualización
    op.execute("UPDATE incidents SET closed_at = updated_at WHERE status IN ('resolved', 'dismissed') AND closed_at IS NULL")


def downgrade() -> None:
    op.drop_index("ix_incidents_status", "incidents")
    op.drop_index("ix_incidents_assigned_to_id", "incidents")
    op.drop_column("incidents", "closed_at")
    op.drop_column("incidents", "assigned_to_id")
    op.drop_column("incidents", "leak_flow")
    op.drop_column("reports", "leak_flow")
    op.execute("DROP TYPE IF EXISTS leak_flow")
    # PostgreSQL no permite quitar un valor de un enum; TECNICO permanece en user_role.
