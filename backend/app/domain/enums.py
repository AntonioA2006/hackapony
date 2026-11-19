import enum


class UserRole(str, enum.Enum):
    CIUDADANO = "CIUDADANO"  # reporta (un ticket activo a la vez) y consulta su estado
    OPERADOR = "OPERADOR"  # despacho: ve todo, valida o descarta y envía a cuadrilla
    CUADRILLA = "CUADRILLA"  # personal de campo: atiende las órdenes asignadas y las cierra
    TECNICO = "TECNICO"  # heredado: equivale a OPERADOR
    ADMINISTRADOR = "ADMINISTRADOR"  # heredado: equivale a OPERADOR
    SUPERADMINISTRADOR = "SUPERADMINISTRADOR"  # supervisión: todo + asigna roles de operador/cuadrilla


# Despacho: ve todas las incidencias, sus fotos y las métricas
OPERATOR_ROLES = (UserRole.OPERADOR, UserRole.TECNICO, UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)
CREW_ROLES = (UserRole.CUADRILLA,)
# Cualquier personal (despacho o campo); la cuadrilla solo ve lo que tiene asignado
STAFF_ROLES = OPERATOR_ROLES + CREW_ROLES
SUPERVISOR_ROLES = (UserRole.SUPERADMINISTRADOR,)
# Roles que supervisión puede asignar
ASSIGNABLE_ROLES = (UserRole.CIUDADANO, UserRole.OPERADOR, UserRole.CUADRILLA)


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
