/**
 * Ubicación del navegador y geocodificación de direcciones en México.
 *
 * - getBrowserPosition: intenta alta precisión (GPS) y, si falla por indisponible/tiempo, una lectura
 *   aproximada (Wi-Fi/red). Devuelve mensajes en español según la causa.
 * - searchAddress / reverseGeocode: OpenStreetMap Nominatim (gratuito, uso moderado: solo en acciones
 *   explícitas de la persona, una petición a la vez). Se envía la dirección escrita o el punto marcado;
 *   nunca datos de la cuenta.
 */

export class GeoError extends Error {
  readonly code: "unsupported" | "insecure" | "denied" | "unavailable" | "timeout";

  constructor(code: GeoError["code"], message: string) {
    super(message);
    this.name = "GeoError";
    this.code = code;
  }
}

const isBrave = () => Boolean((navigator as Navigator & { brave?: unknown }).brave);

function messageFor(code: number): GeoError {
  if (code === 1) {
    return new GeoError(
      "denied",
      "El permiso de ubicación está bloqueado. Actívalo desde el candado junto a la dirección del sitio, o marca el punto en el mapa.",
    );
  }
  if (code === 3) {
    return new GeoError("timeout", "Tu dispositivo tardó demasiado en dar la ubicación. Inténtalo otra vez o marca el punto en el mapa.");
  }
  return new GeoError(
    "unavailable",
    isBrave()
      ? "Brave bloquea el servicio de ubicación por defecto. Actívalo en brave://settings/privacy (“Usar los servicios de Google para la ubicación”), o marca el punto en el mapa o busca tu dirección."
      : "Tu dispositivo no pudo determinar la ubicación (sin GPS o servicios de ubicación apagados). Marca el punto en el mapa o busca tu dirección.",
  );
}

function readPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}

export async function getBrowserPosition(): Promise<{ lat: number; lon: number; accuracy: number }> {
  if (!window.isSecureContext) throw new GeoError("insecure", "La ubicación solo funciona en una conexión segura (https).");
  if (!("geolocation" in navigator)) throw new GeoError("unsupported", "Tu navegador no permite obtener la ubicación.");
  try {
    const p = await readPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    return { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy };
  } catch (first) {
    const code = (first as GeolocationPositionError)?.code;
    if (code === 1) throw messageFor(1);
    try {
      const p = await readPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60000 });
      return { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy };
    } catch (second) {
      throw messageFor((second as GeolocationPositionError)?.code ?? 2);
    }
  }
}

const NOMINATIM = "https://nominatim.openstreetmap.org";

export type AddressResult = { label: string; lat: number; lon: number };

type NominatimItem = { display_name: string; lat: string; lon: string };
type NominatimReverse = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

export async function searchAddress(query: string, signal?: AbortSignal): Promise<AddressResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${NOMINATIM}/search?format=jsonv2&countrycodes=mx&limit=5&accept-language=es&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("No pudimos buscar la dirección. Intenta de nuevo en unos segundos.");
  const items = (await res.json()) as NominatimItem[];
  return items.map((i) => ({ label: i.display_name, lat: Number(i.lat), lon: Number(i.lon) }));
}

/** Dirección legible del punto: calle y número, colonia y código postal cuando existen. */
export async function reverseGeocode(lat: number, lon: number, signal?: AbortSignal): Promise<string | null> {
  const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=es&lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimReverse;
  const a = data.address ?? {};
  const street = [a.road ?? a.pedestrian ?? a.footway, a.house_number].filter(Boolean).join(" ");
  const colonia = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district;
  const parts = [street, colonia, a.postcode ? `C.P. ${a.postcode}` : undefined].filter(Boolean);
  return parts.length ? parts.join(", ") : data.display_name ?? null;
}

export const MAX_REPORT_DISTANCE_M = 250;

export function metersBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6_371_000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dlat = ((lat2 - lat1) * Math.PI) / 180;
  const dlon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dlon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Valida coordenadas escritas a mano (acepta coma decimal). */
export function parseCoordinate(raw: string, kind: "lat" | "lon"): number | null {
  const v = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(v)) return null;
  const [min, max] = kind === "lat" ? [14, 33.5] : [-118.5, -86.5];
  return v >= min && v <= max ? v : null;
}
