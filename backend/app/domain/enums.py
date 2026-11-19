import enum


class UserRole(str, enum.Enum):
    CIUDADANO = "CIUDADANO"  # reporta y consulta el estado de sus reportes
    TECNICO = "TECNICO"  # atiende incidencias: valida, toma, atiende y resuelve
    ADMINISTRADOR = "ADMINISTRADOR"  # heredado: mismas capacidades que TECNICO
    SUPERADMINISTRADOR = "SUPERADMINISTRADOR"  # supervisión: todo + gestión de técnicos y asignación


# Personal operativo (ve todas las incidencias, fotos y métricas)
STAFF_ROLES = (UserRole.TECNICO, UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)
SUPERVISOR_ROLES = (UserRole.SUPERADMINISTRADOR,)


class ReportCategory(str, enum.Enum):
    leak_public_road = "leak_public_road"
    broken_pipe = "broken_pipe"
    public_infra_leak = "public_infra_leak"
    flood_from_leak = "flood_from_leak"
    supply_issue = "supply_issue"
    other_water = "other_water"


LEAK_CATEGORIES = {
    ReportCategory.leak_public_road,
    ReportCategory.broken_pipe,
    ReportCategory.public_infra_leak,
    ReportCategory.flood_from_leak,
}


class LeakSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ReportStatus(str, enum.Enum):
    received = "received"
    under_review = "under_review"
    validated = "validated"
    in_progress = "in_progress"
    resolved = "resolved"
    rejected = "rejected"


class IncidentStatus(str, enum.Enum):
    open = "open"
    triaged = "triaged"
    in_progress = "in_progress"
    resolved = "resolved"
    dismissed = "dismissed"


class PriorityBand(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"

class LeakFlow(str, enum.Enum):
    """Magnitud observada de la fuga: base del desperdicio estimado."""

    goteo = "goteo"
    chorro = "chorro"
    inundacion = "inundacion"


FLOW_ORDER = [LeakFlow.goteo, LeakFlow.chorro, LeakFlow.inundacion]
