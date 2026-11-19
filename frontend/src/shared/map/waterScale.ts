/**
 * Coropleta: % de viviendas SIN agua entubada (INEGI, Censo 2020).
 * Escala secuencial de azules: más intenso = más carencia. Los marcadores usan colores de prioridad
 * (cálidos) para que se distingan de la coropleta (fría).
 */
export const WATER_BREAKS = [1, 3, 7, 15] as const; // %
export const WATER_COLORS = ["#eaf4fb", "#bfe0f3", "#7fc0e6", "#2f94cf", "#0e5c8e"] as const;
export const NO_DATA_COLOR = "#e1e8ef";

export function waterColor(pct: number | null | undefined): string {
  if (pct == null) return NO_DATA_COLOR;
  const idx = WATER_BREAKS.findIndex((b) => pct < b);
  return WATER_COLORS[idx === -1 ? WATER_COLORS.length - 1 : idx];
}

export const WATER_LEGEND = [
  { label: "< 1 %", color: WATER_COLORS[0] },
  { label: "1–3 %", color: WATER_COLORS[1] },
  { label: "3–7 %", color: WATER_COLORS[2] },
  { label: "7–15 %", color: WATER_COLORS[3] },
  { label: "≥ 15 %", color: WATER_COLORS[4] },
  { label: "Sin dato", color: NO_DATA_COLOR },
];

export const BAND_COLORS: Record<string, string> = {
  low: "#7fa3bf",
  medium: "#e9b230",
  high: "#ee8a2e",
  critical: "#d9483b",
};
export const BAND_RADIUS: Record<string, number> = { low: 6, medium: 7, high: 9, critical: 11 };
