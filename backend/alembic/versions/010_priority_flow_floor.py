"""prioridad: suma el caudal (inundación) y aplica piso por gravedad crítica

Revision ID: 010
Revises: 009
"""

from typing import Sequence, Union

from alembic import op

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ACTIVE = "status NOT IN ('resolved', 'dismissed')"


def upgrade() -> None:
    # Mismo criterio que app.domain.priority.compute_urgency (FLOW_POINTS, band_floor, band_from_score).
    op.execute(
        f"""
        UPDATE incidents SET urgency_score = LEAST(100, urgency_score +
            CASE leak_flow WHEN 'chorro' THEN 6 WHEN 'inundacion' THEN 15 ELSE 0 END)
        WHERE {_ACTIVE}
        """
    )
    op.execute(
        f"""
        UPDATE incidents SET urgency_score = GREATEST(urgency_score,
            CASE
                WHEN aggregated_severity = 'critical' AND leak_flow = 'inundacion' THEN 80
                WHEN aggregated_severity = 'critical' OR leak_flow = 'inundacion' THEN 60
                ELSE 0
            END)
        WHERE {_ACTIVE}
        """
    )
    op.execute(
        f"""
        UPDATE incidents SET priority_band = (CASE
            WHEN urgency_score >= 80 THEN 'critical'
            WHEN urgency_score >= 60 THEN 'high'
            WHEN urgency_score >= 35 THEN 'medium'
            ELSE 'low'
        END)::priority_band
        WHERE {_ACTIVE}
        """
    )


def downgrade() -> None:
    pass
