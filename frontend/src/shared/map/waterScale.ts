/**
 * Escala secuencial de un solo tono (cian) para el % de viviendas SIN agua entubada (INEGI, Censo 2020).
 * Un solo matiz mantiene la restricción cromática del sistema y se lee como "más intenso = más carencia".
 */
export const WATER_BREAKS = [1, 3, 7, 15] as const; // % — cortes por cuantiles aproximados del dato municipal
export const WATER_COLORS = ["#eef7fd", "#c1e1f7", "#7cc4f4", "#3ba6f1", "#1d6fa5"] as const;
export const NO_DATA_COLOR = "#e8e6e5";

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

/** Marcadores de incidencias: neutros oscuros sobre la coropleta cian; tamaño = prioridad. */
export const BAND_RADIUS: Record<string, number> = { low: 5, medium: 7, high: 9, critical: 11 };
