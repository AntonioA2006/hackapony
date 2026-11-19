"""Estimación de agua desperdiciada por incidencia.

Caudales de REFERENCIA (no medidos) para ordenar y comunicar la magnitud; deben calibrarse con datos del
organismo operador:
- goteo:      ~5 L/h    (goteo continuo en toma o válvula)
- chorro:     ~600 L/h  (≈0.17 L/s, flujo continuo visible)
- inundación: ~6000 L/h (≈1.7 L/s, ruptura con encharcamiento)

Litros = caudal × horas abierta (hasta el cierre o ahora), con tope de 30 días para no inflar casos olvidados.
"""
from datetime import UTC, datetime

from app.domain.enums import LeakFlow

FLOW_RATE_LPH: dict[LeakFlow, float] = {
    LeakFlow.goteo: 5.0,
    LeakFlow.chorro: 600.0,
    LeakFlow.inundacion: 6000.0,
}
MAX_HOURS = 24 * 30


def estimated_liters(flow: LeakFlow | str | None, opened_at: datetime | None, closed_at: datetime | None = None, now: datetime | None = None) -> float | None:
    if flow is None or opened_at is None:
        return None
    flow = LeakFlow(flow)
    end = closed_at or now or datetime.now(UTC)
    if opened_at.tzinfo is None:
        opened_at = opened_at.replace(tzinfo=UTC)
    if end.tzinfo is None:
        end = end.replace(tzinfo=UTC)
    hours = max(0.0, min((end - opened_at).total_seconds() / 3600, MAX_HOURS))
    return round(FLOW_RATE_LPH[flow] * hours, 1)
