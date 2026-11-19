import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { apiFetch } from "../api/client";

/**
 * Segmentación nacional → entidad → municipio.
 *
 * Privacidad: la ubicación del navegador solo se usa para preguntar a la API en qué estado/municipio
 * está el punto; las coordenadas no se guardan. Lo que se recuerda (cookie de primera parte, 180 días)
 * es la región elegida y la decisión sobre el permiso.
 */
export type Region = {
  cve_ent: string | null;
  state_name: string | null;
  cvegeo: string | null;
  municipality_name: string | null;
};

export type LocationConsent = "granted" | "denied" | "unset";

const REGION_COOKIE = "aa_region";
const CONSENT_COOKIE = "aa_loc_consent";
const MAX_AGE = 60 * 60 * 24 * 180;
const NATIONAL: Region = { cve_ent: null, state_name: null, cvegeo: null, municipality_name: null };

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

function initialRegion(): Region {
  try {
    const raw = readCookie(REGION_COOKIE);
    if (!raw) return NATIONAL;
    const parsed = JSON.parse(raw) as Partial<Region>;
    const ok = (v: unknown, re: RegExp) => typeof v === "string" && re.test(v);
    return {
      cve_ent: ok(parsed.cve_ent, /^\d{2}$/) ? parsed.cve_ent! : null,
      state_name: typeof parsed.state_name === "string" ? parsed.state_name.slice(0, 120) : null,
      cvegeo: ok(parsed.cvegeo, /^\d{5}$/) ? parsed.cvegeo! : null,
      municipality_name: typeof parsed.municipality_name === "string" ? parsed.municipality_name.slice(0, 120) : null,
    };
  } catch {
    return NATIONAL;
  }
}

type LocateResponse = {
  state: { cve_ent: string; name: string };
  municipality: { cvegeo: string; name: string } | null;
};

type RegionState = {
  region: Region;
  consent: LocationConsent;
  locating: boolean;
  locateError: string | null;
  setRegion: (r: Region) => void;
  setNational: () => void;
  useMyLocation: () => Promise<void>;
  declineLocation: () => void;
};

const RegionContext = createContext<RegionState | null>(null);

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<Region>(initialRegion);
  const [consent, setConsent] = useState<LocationConsent>(() => {
    const v = readCookie(CONSENT_COOKIE);
    return v === "granted" || v === "denied" ? v : "unset";
  });
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const setRegion = useCallback((r: Region) => {
    setRegionState(r);
    writeCookie(REGION_COOKIE, JSON.stringify(r));
  }, []);

  const setNational = useCallback(() => setRegion(NATIONAL), [setRegion]);

  const declineLocation = useCallback(() => {
    setConsent("denied");
    writeCookie(CONSENT_COOKIE, "denied");
  }, []);

  const useMyLocation = useCallback(async () => {
    setLocateError(null);
    if (!("geolocation" in navigator)) {
      setLocateError("Tu navegador no permite obtener la ubicación. Elige tu estado manualmente.");
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 10 * 60 * 1000,
        }),
      );
      setConsent("granted");
      writeCookie(CONSENT_COOKIE, "granted");
      const loc = await apiFetch<LocateResponse>(
        `/regions/locate?lat=${pos.coords.latitude.toFixed(4)}&lon=${pos.coords.longitude.toFixed(4)}`,
      );
      setRegion({
        cve_ent: loc.state.cve_ent,
        state_name: loc.state.name,
        cvegeo: loc.municipality?.cvegeo ?? null,
        municipality_name: loc.municipality?.name ?? null,
      });
    } catch (err) {
      const geoErr = err as GeolocationPositionError;
      if (geoErr?.code === 1) {
        declineLocation();
        setLocateError("Permiso de ubicación denegado. Puedes elegir tu estado manualmente.");
      } else if (geoErr?.code === 2 || geoErr?.code === 3) {
        setLocateError("No pudimos obtener tu ubicación. Elige tu estado manualmente.");
      } else {
        setLocateError((err as Error)?.message || "No pudimos ubicar tu región.");
      }
    } finally {
      setLocating(false);
    }
  }, [declineLocation, setRegion]);

  return (
    <RegionContext.Provider
      value={{ region, consent, locating, locateError, setRegion, setNational, useMyLocation, declineLocation }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion outside provider");
  return ctx;
}
