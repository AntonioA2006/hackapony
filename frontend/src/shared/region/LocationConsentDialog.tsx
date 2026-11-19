import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button, Notice } from "../ui";
import { RegionSelect } from "./RegionPicker";
import { useRegion } from "./RegionContext";

const SKIP_PATHS = ["/login", "/registro", "/recuperar", "/restablecer", "/auth/accion"];

/**
 * Primera visita: pide permiso para usar la ubicación (una vez) y así segmentar el mapa por estado y municipio.
 * La decisión y la región se guardan en cookies de primera parte; nunca se guardan coordenadas.
 */
export default function LocationConsentDialog() {
  const { consent, region, locating, locateError, useMyLocation, declineLocation } = useRegion();
  const [manual, setManual] = useState(false);
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open || consent !== "unset" || region.cve_ent || SKIP_PATHS.includes(pathname)) return;
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [open, consent, region.cve_ent, pathname]);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        declineLocation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, declineLocation]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="loc-title"
        aria-describedby="loc-desc"
        className="w-full max-w-md rounded-feature border border-line bg-card p-6 shadow-float"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-sky text-cyan-edge" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </div>
        <h2 id="loc-title" className="text-subheading">¿Te mostramos lo que pasa cerca de ti?</h2>
        <p id="loc-desc" className="mt-2 text-body text-warm">
          Con tu permiso usamos tu ubicación <strong className="font-medium text-ink">una sola vez</strong> para identificar tu
          estado y municipio en México. No guardamos tus coordenadas: solo recordamos la región en una cookie de este sitio
          (180 días). Puedes cambiarla cuando quieras.
        </p>
        {manual ? (
          <div className="mt-5 space-y-3">
            {locateError && <Notice tone="error">{locateError}</Notice>}
            <RegionSelect compact hideLocate />
            <div className="flex justify-end gap-2">
              <Button
                variant="primary"
                disabled={!region.cve_ent}
                onClick={() => {
                  declineLocation(); // no volver a preguntar; la región elegida ya quedó en la cookie
                  setOpen(false);
                }}
              >
                Guardar mi región
              </Button>
              <Button variant="quiet" onClick={() => { declineLocation(); setOpen(false); }}>
                Ver todo México
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              ref={primaryRef}
              variant="primary"
              disabled={locating}
              onClick={async () => {
                const ok = await useMyLocation();
                if (ok) setOpen(false);
                else setManual(true); // p. ej. Brave sin servicio de ubicación: elegir a mano aquí mismo
              }}
            >
              {locating ? "Ubicando…" : "Usar mi ubicación"}
            </Button>
            <Button onClick={() => setManual(true)}>Elegir mi estado</Button>
            <Button
              variant="quiet"
              onClick={() => {
                declineLocation();
                setOpen(false);
              }}
            >
              Ahora no
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
