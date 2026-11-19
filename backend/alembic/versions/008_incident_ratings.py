"""satisfacción ciudadana sobre incidencias

Revision ID: 008
Revises: 007
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "incident_ratings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("score BETWEEN 1 AND 5", name="incident_ratings_score_ck"),
        sa.UniqueConstraint("incident_id", "user_id", name="incident_ratings_unique"),
    )
    op.create_index("ix_incident_ratings_incident_id", "incident_ratings", ["incident_id"])
    op.create_index("ix_incident_ratings_user_id", "incident_ratings", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_incident_ratings_user_id", "incident_ratings")
    op.drop_index("ix_incident_ratings_incident_id", "incident_ratings")
    op.drop_table("incident_ratings")
