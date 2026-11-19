export const CATEGORY_LABELS: Record<string, string> = {
  leak_public_road: "Fuga en vía pública",
  broken_pipe: "Tubería rota",
  public_infra_leak: "Fuga en infraestructura pública",
  flood_from_leak: "Encharcamiento por fuga",
  supply_issue: "Falta de suministro",
  other_water: "Otro problema de agua",
};

export const SEVERITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

export const BAND_LABELS = SEVERITY_LABELS;

export const REPORT_STATUS_LABELS: Record<string, string> = {
  received: "Recibido",
  under_review: "En revisión",
  validated: "Validado",
  rejected: "Rechazado",
  in_progress: "En atención",
  resolved: "Resuelto",
};

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  triaged: "Clasificada",
  in_progress: "En atención",
  resolved: "Resuelta",
  dismissed: "Descartada",
};

export const label = (map: Record<string, string>, key: string | null | undefined) => (key ? map[key] ?? key : "—");

export const fmtInt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("es-MX"));
export const fmtPct = (n: number | null | undefined) =>
  n == null ? "Sin dato" : `${n.toLocaleString("es-MX", { maximumFractionDigits: 1 })} %`;

export const FLOW_LABELS: Record<string, string> = {
  goteo: "Goteo",
  chorro: "Chorro",
  inundacion: "Inundación",
  sin_dato: "Sin dato",
};

/** Caudales de referencia (deben coincidir con backend/app/domain/waste.py). */
export const FLOW_RATE_LPH: Record<string, number> = { goteo: 5, chorro: 600, inundacion: 6000 };

export const fmtLiters = (l: number | null | undefined) => {
  if (l == null) return "—";
  if (l >= 1_000_000) return `${(l / 1_000_000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} millones de L`;
  if (l >= 1000) return `${(l / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} m³`;
  return `${Math.round(l).toLocaleString("es-MX")} L`;
};

export const fmtHours = (h: number | null | undefined) => {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toLocaleString("es-MX", { maximumFractionDigits: 1 })} h`;
  return `${(h / 24).toLocaleString("es-MX", { maximumFractionDigits: 1 })} días`;
};
