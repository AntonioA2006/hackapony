import enum


class UserRole(str, enum.Enum):
    CIUDADANO = "CIUDADANO"
    ADMINISTRADOR = "ADMINISTRADOR"
    SUPERADMINISTRADOR = "SUPERADMINISTRADOR"


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