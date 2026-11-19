"""roles OPERADOR y CUADRILLA; teléfono de contacto opcional en reportes

Revision ID: 007
Revises: 006
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'OPERADOR' BEFORE 'TECNICO'")
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CUADRILLA' BEFORE 'TECNICO'")
    # Visible solo para despacho y la cuadrilla asignada (botón "Llamar"); nunca en el mapa público
    op.add_column("reports", sa.Column("contact_phone", sa.String(15)))


def downgrade() -> None:
    op.drop_column("reports", "contact_phone")
    # PostgreSQL no permite quitar valores de un enum; OPERADOR y CUADRILLA permanecen.
