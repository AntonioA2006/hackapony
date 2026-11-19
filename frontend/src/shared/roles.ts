export type Role = "CIUDADANO" | "OPERADOR" | "CUADRILLA" | "TECNICO" | "ADMINISTRADOR" | "SUPERADMINISTRADOR";

export const ROLE_LABELS: Record<string, string> = {
  CIUDADANO: "Ciudadano",
  OPERADOR: "Operador",
  CUADRILLA: "Cuadrilla",
  TECNICO: "Operador",
  ADMINISTRADOR: "Operador",
  SUPERADMINISTRADOR: "Supervisión",
};

/** Despacho: ve todas las incidencias, valida y envía a cuadrilla. */
export const isOperator = (role?: string | null) =>
  role === "OPERADOR" || role === "TECNICO" || role === "ADMINISTRADOR" || role === "SUPERADMINISTRADOR";
/** Personal de campo: solo sus órdenes asignadas. */
export const isCrew = (role?: string | null) => role === "CUADRILLA";
/** Cualquier personal (para vistas comunes, p. ej. el mapa del personal). */
export const isStaff = (role?: string | null) => isOperator(role) || isCrew(role);
/** Supervisión: asigna roles, reabre y puede todo. */
export const isSupervisor = (role?: string | null) => role === "SUPERADMINISTRADOR";

/** Inicio de cada rol después de entrar. */
export const homeFor = (role?: string | null) => (isCrew(role) ? "/cuadrilla" : isOperator(role) ? "/panel" : "/tablero");
