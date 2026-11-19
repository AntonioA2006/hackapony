export type Role = "CIUDADANO" | "TECNICO" | "ADMINISTRADOR" | "SUPERADMINISTRADOR";

export const ROLE_LABELS: Record<string, string> = {
  CIUDADANO: "Ciudadano",
  TECNICO: "Técnico",
  ADMINISTRADOR: "Técnico",
  SUPERADMINISTRADOR: "Supervisión",
};

/** Personal operativo: ve todas las incidencias, sus fotos y las métricas. */
export const isStaff = (role?: string | null) => role === "TECNICO" || role === "ADMINISTRADOR" || role === "SUPERADMINISTRADOR";
/** Supervisión: además nombra técnicos, asigna, descarta y reabre. */
export const isSupervisor = (role?: string | null) => role === "SUPERADMINISTRADOR";
