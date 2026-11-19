/**
 * Teselas del mapa nacional.
 *
 * `VITE_MAP_TILE_URL` / `VITE_MAP_TILE_ATTRIBUTION` son el nombre canónico (build de Vite).
 * `VITE_TILE_URL` / `VITE_TILE_ATTRIBUTION` se siguen leyendo para no romper un entorno que ya las definía.
 * Si ambas vienen vacías, el mapa usa Esri World Light Gray (sin clave), el mismo default de esta rama.
 */
export const DEFAULT_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

export const DEFAULT_TILE_ATTRIBUTION =
  'Mapa base &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const INEGI_ATTRIBUTION_SUFFIX =
  ' · Límites y agua: <a href="https://www.inegi.org.mx/temas/agua/">INEGI</a>';

function configured(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function mapTileUrl(): string {
  return configured(import.meta.env.VITE_MAP_TILE_URL) ?? configured(import.meta.env.VITE_TILE_URL) ?? DEFAULT_TILE_URL;
}

export function mapTileAttribution(): string {
  const base =
    configured(import.meta.env.VITE_MAP_TILE_ATTRIBUTION) ??
    configured(import.meta.env.VITE_TILE_ATTRIBUTION) ??
    DEFAULT_TILE_ATTRIBUTION;
  return `${base}${INEGI_ATTRIBUTION_SUFFIX}`;
}
