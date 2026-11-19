import { Button, Notice } from "../ui";
import { useMunicipalities, useStates } from "./api";
import { useRegion } from "./RegionContext";

/** Muestra errores de ubicación; el permiso se pide en LocationConsentDialog (primera visita). */
export function LocationPrompt() {
  const { locateError } = useRegion();
  return locateError ? <Notice tone="error">{locateError}</Notice> : null;
}

export function RegionSelect({ compact = false, hideLocate = false }: { compact?: boolean; hideLocate?: boolean }) {
  const { region, setRegion, setNational, useMyLocation, locating } = useRegion();
  const states = useStates();
  const municipalities = useMunicipalities(region.cve_ent);

  return (
    <div className={`flex flex-wrap items-end gap-3 ${compact ? "" : "rounded-card border border-line bg-card p-4"}`}>
      <label className="min-w-[200px] flex-1">
        <span className="label">Estado</span>
        <select
          className="field"
          value={region.cve_ent ?? ""}
          onChange={(e) => {
            const st = states.data?.find((s) => s.cve_ent === e.target.value);
            if (!st) return setNational();
            setRegion({ cve_ent: st.cve_ent, state_name: st.name, cvegeo: null, municipality_name: null });
          }}
        >
          <option value="">Todo México</option>
          {states.data?.map((s) => (
            <option key={s.cve_ent} value={s.cve_ent}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-[200px] flex-1">
        <span className="label">Municipio o alcaldía</span>
        <select
          className="field"
          value={region.cvegeo ?? ""}
          disabled={!region.cve_ent || municipalities.isLoading}
          onChange={(e) => {
            const m = municipalities.data?.find((x) => x.cvegeo === e.target.value);
            setRegion({
              ...region,
              cvegeo: m?.cvegeo ?? null,
              municipality_name: m?.name ?? null,
            });
          }}
        >
          <option value="">{region.cve_ent ? "Todo el estado" : "Elige un estado primero"}</option>
          {municipalities.data?.map((m) => (
            <option key={m.cvegeo} value={m.cvegeo}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      {!hideLocate && (
        <Button variant="ghost" onClick={() => void useMyLocation()} disabled={locating}>
          {locating ? "Ubicando…" : "Mi ubicación"}
        </Button>
      )}
    </div>
  );
}
