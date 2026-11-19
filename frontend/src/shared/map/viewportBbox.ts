/**
 * Rectángulo que el mapa puede pedir a `GET /incidents/public`.
 *
 * Se recorta a la zona de operación (México y un margen). Ese recorte mide
 * 39.5° × 24°, por debajo del techo del API (50° de longitud y 40° de latitud
 * en `backend/app/services/public_geo.py`). Si se amplía esta caja, hay que
 * subir esos techos o la vista nacional responderá 422.
 */
export const MAP_OPERATING_BOUNDS = {
  minLat: 11.5,
  maxLat: 35.5,
  minLon: -122.5,
  maxLon: -83.0,
} as const;

/** Debe coincidir con BBOX_MAX_LON_SPAN / BBOX_MAX_LAT_SPAN. */
export const API_BBOX_MAX_LON_SPAN = 50;
export const API_BBOX_MAX_LAT_SPAN = 40;

export const VIEWPORT_DEBOUNCE_MS = 300;

export type BBox = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

export function clipToOperatingArea(bbox: BBox): BBox | null {
  const minLon = Math.max(bbox.minLon, MAP_OPERATING_BOUNDS.minLon);
  const minLat = Math.max(bbox.minLat, MAP_OPERATING_BOUNDS.minLat);
  const maxLon = Math.min(bbox.maxLon, MAP_OPERATING_BOUNDS.maxLon);
  const maxLat = Math.min(bbox.maxLat, MAP_OPERATING_BOUNDS.maxLat);
  if (minLon >= maxLon || minLat >= maxLat) return null;
  return { minLon, minLat, maxLon, maxLat };
}

export function formatBBox(bbox: BBox): string {
  const n = (v: number) => v.toFixed(6);
  return `${n(bbox.minLon)},${n(bbox.minLat)},${n(bbox.maxLon)},${n(bbox.maxLat)}`;
}

export function boundsToQueryBBox(bounds: {
  getWest: () => number;
  getSouth: () => number;
  getEast: () => number;
  getNorth: () => number;
}): string | null {
  const clipped = clipToOperatingArea({
    minLon: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLon: bounds.getEast(),
    maxLat: bounds.getNorth(),
  });
  return clipped ? formatBBox(clipped) : null;
}
