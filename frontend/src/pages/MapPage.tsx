import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LatLngBoundsExpression } from "leaflet";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isOperator } from "../shared/roles";
import { useRegionCounts } from "../shared/staff/api";
import { apiFetch } from "../shared/api/client";
import { useAuth } from "../shared/auth/AuthContext";
import { BAND_LABELS, CATEGORY_LABELS, fmtInt, fmtPct, label } from "../shared/labels";
import IncidentsMap, { MEXICO_BOUNDS, type MapIncident } from "../shared/map/IncidentsMap";
import { BAND_COLORS, INCIDENT_LEGEND, regionIncidentColor, WATER_LEGEND } from "../shared/map/waterScale";
import { useMunicipalities, useMunicipalitiesGeo, useStates, useStatesGeo, type Water } from "../shared/region/api";
import { useRegion } from "../shared/region/RegionContext";
import { LocationPrompt, RegionSelect } from "../shared/region/RegionPicker";
import QueryError from "../shared/ui/QueryError";
import { ButtonLink, Notice, PageHeader, PriorityTag, Tag } from "../shared/ui";

type Paginated<T> = { items: T[]; total: number };

const toBounds = (b: [number, number, number, number] | null | undefined): LatLngBoundsExpression | null =>
  b ? [[b[1], b[0]], [b[3], b[2]]] : null;

function WaterPanel({ title, water }: { title: string; water: Water | undefined }) {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      <p className="text-[12px] font-medium uppercase tracking-[0.025em] text-warm">Agua en viviendas · {title}</p>
      {water ? (
        <>
          <p className="mt-2 font-display text-heading-sm tabular-nums">{fmtPct(water.pct_sin_agua_entubada)}</p>
          <p className="text-body text-warm">de las viviendas no tiene agua entubada</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-warm">Viviendas habitadas</dt>
            <dd className="text-right tabular-nums">{fmtInt(water.viviendas)}</dd>
            <dt className="text-warm">Sin agua entubada</dt>
            <dd className="text-right tabular-nums">{fmtInt(water.sin_agua_entubada)}</dd>
            <dt className="text-warm">Con tinaco</dt>
            <dd className="text-right tabular-nums">{fmtInt(water.con_tinaco)}</dd>
            <dt className="text-warm">Con cisterna o aljibe</dt>
            <dd className="text-right tabular-nums">{fmtInt(water.con_cisterna)}</dd>
          </dl>
        </>
      ) : (
        <p className="mt-2 text-body text-warm">Sin dato censal para esta zona (municipio creado después de 2020).</p>
      )}
      <p className="mt-4 text-[11px] text-ash">Fuente: INEGI, Censo de Población y Vivienda 2020 (ITER).</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      <p className="text-[12px] font-medium uppercase tracking-[0.025em] text-warm">Cómo leer el mapa</p>
      <p className="mt-2 text-[13px] text-ink">Viviendas sin agua entubada</p>
      <ul className="mt-2 grid grid-cols-3 gap-2 text-[12px] text-warm">
        {WATER_LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-line" style={{ background: l.color }} />
            {l.label}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] text-ink">Incidencias reportadas</p>
      <ul className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-warm">
        {(["low", "medium", "high", "critical"] as const).map((b, i) => (
          <li key={b} className="flex items-center gap-1.5">
            <span
              className="rounded-full"
              style={{ width: 8 + i * 3, height: 8 + i * 3, background: BAND_COLORS[b], boxShadow: "0 0 0 2px #fff, 0 0 0 3px #e1e8ef" }}
            />
            {BAND_LABELS[b]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MapPage() {
  const { user } = useAuth();
  const { region, setRegion } = useRegion();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [bbox, setBbox] = useState<string | null | undefined>(undefined);

  const states = useStates();
  const municipalities = useMunicipalities(region.cve_ent);
  const statesGeo = useStatesGeo();
  const munGeo = useMunicipalitiesGeo(region.cve_ent);

  const staff = isOperator(user?.role); // despacho: mapa completo y capa de incidencias (la cuadrilla ve el público)
  const [search, setSearch] = useSearchParams();
  const fLat = Number(search.get("lat"));
  const fLon = Number(search.get("lon"));
  const focus = Number.isFinite(fLat) && Number.isFinite(fLon) && search.get("lat") && search.get("lon")
    ? { lat: fLat, lon: fLon, id: search.get("id") }
    : null;
  const [layer, setLayer] = useState<"agua" | "incidencias">(staff ? "incidencias" : "agua");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const counts = useRegionCounts(region.cve_ent, staff && layer === "incidencias");
  const regionColors = useMemo(() => {
    if (!(staff && layer === "incidencias")) return null;
    const out: Record<string, string> = {};
    for (const r of counts.data?.items ?? []) {
      const c = regionIncidentColor(r);
      if (c) out[r.id] = c;
    }
    return out;
  }, [staff, layer, counts.data]);

  // Al enfocar un punto (desde un reporte) se cargan las incidencias alrededor; si no, las del área visible.
  const focusBbox = focus
    ? [focus.lon - 0.05, focus.lat - 0.05, focus.lon + 0.05, focus.lat + 0.05].map((v) => v.toFixed(4)).join(",")
    : null;
  const queryBbox = focusBbox ?? bbox;
  const incidents = useQuery({
    queryKey: ["map-incidents", staff ? "staff" : "public", queryBbox],
    enabled: typeof queryBbox === "string",
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ bbox: queryBbox as string, page_size: "200" });
      const path = staff ? "/incidents/map" : "/incidents/public";
      return apiFetch<Paginated<MapIncident>>(`${path}?${params}`, { signal });
    },
  });

  const rateMut = useMutation({
    mutationFn: ({ id, score }: { id: string; score: number }) =>
      apiFetch(`/incidents/${id}/satisfaction`, { method: "POST", body: JSON.stringify({ score }) }),
    onSuccess: () => {
      setNotice({ tone: "success", text: "Gracias: tu calificación ya cuenta en la satisfacción." });
      void qc.invalidateQueries({ queryKey: ["public-stats"] });
    },
    onError: (e) => setNotice({ tone: "error", text: (e as Error).message }),
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/incidents/${id}/confirm`, { method: "POST" }),
    onSuccess: () => {
      setNotice({ tone: "success", text: "Gracias: tu confirmación ayuda a priorizar la atención." });
      void qc.invalidateQueries({ queryKey: ["map-incidents"] });
    },
    onError: (e) => setNotice({ tone: "error", text: (e as Error).message }),
  });

  const stateItem = states.data?.find((s) => s.cve_ent === region.cve_ent);
  const munItem = municipalities.data?.find((m) => m.cvegeo === region.cvegeo);
  const bounds = useMemo(
    () => toBounds(munItem?.bbox) ?? toBounds(stateItem?.bbox) ?? (region.cve_ent ? null : MEXICO_BOUNDS),
    [munItem?.bbox, stateItem?.bbox, region.cve_ent],
  );

  const national = useMemo(() => {
    const items = states.data ?? [];
    const viv = items.reduce((a, s) => a + (s.water?.viviendas ?? 0), 0);
    const sin = items.reduce((a, s) => a + (s.water?.sin_agua_entubada ?? 0), 0);
    if (!viv) return undefined;
    return {
      viviendas: viv,
      sin_agua_entubada: sin,
      con_agua_entubada: items.reduce((a, s) => a + (s.water?.con_agua_entubada ?? 0), 0),
      con_tinaco: items.reduce((a, s) => a + (s.water?.con_tinaco ?? 0), 0),
      con_cisterna: items.reduce((a, s) => a + (s.water?.con_cisterna ?? 0), 0),
      pct_sin_agua_entubada: Math.round((10000 * sin) / viv) / 100,
      reference_year: 2020,
    } satisfies NonNullable<Water>;
  }, [states.data]);

  const placeTitle = region.municipality_name ?? region.state_name ?? "México";
  const water = region.cvegeo ? munItem?.water : region.cve_ent ? stateItem?.water : national;
  const fetched = incidents.data?.items ?? [];
  const list = fetched.filter(
    (inc) => (category === "all" || inc.primary_category === category) && (priority === "all" || inc.priority_band === priority),
  );
  const waiting = bbox === undefined || (typeof bbox === "string" && incidents.isLoading && list.length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            Incidencias en <span className="highlight">{placeTitle}</span>
          </>
        }
        lead="Fugas y problemas de agua reportados por la ciudadanía, sobre el contexto oficial de acceso al agua en viviendas."
        actions={<ButtonLink to="/reportar" variant="primary">Reportar fuga</ButtonLink>}
      />
      <LocationPrompt />
      <RegionSelect />
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {incidents.error && <QueryError error={incidents.error} context="map" onRetry={() => void incidents.refetch()} />}
          {staff && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Capa del mapa">
              {(
                [
                  ["incidencias", "Incidencias activas"],
                  ["agua", "Agua en viviendas (INEGI)"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={layer === k}
                  onClick={() => setLayer(k)}
                  className={`press rounded-full border px-3 py-1.5 text-[13px] ${layer === k ? "border-soot bg-soot text-white" : "border-line bg-card text-ink hover:border-muted"}`}
                >
                  {l}
                </button>
              ))}
              {layer === "incidencias" && (
                <ul className="ml-auto flex flex-wrap gap-3 text-[12px] text-warm">
                  {INCIDENT_LEGEND.map((x) => (
                    <li key={x.label} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm" style={{ background: x.color }} /> {x.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {focus && (
            <div className="anim-fade flex flex-wrap items-center gap-3 rounded-card border border-cyan/30 bg-sky/40 px-4 py-2 text-[13px]">
              <span className="text-ink">Mostrando la ubicación exacta del reporte.</span>
              <button type="button" className="text-cyan-edge hover:underline" onClick={() => setSearch({}, { replace: true })}>
                Volver a la vista de mi región
              </button>
            </div>
          )}
          <IncidentsMap
            incidents={list}
            focus={focus}
            regionColors={regionColors}
            detailHref={staff ? (id) => `/panel/incidencias/${id}` : undefined}
            regions={region.cve_ent ? munGeo.data : statesGeo.data}
            selectedRegionId={region.cve_ent ? region.cvegeo : null}
            bounds={bounds}
            onViewportChange={setBbox}
            onConfirm={user ? (id) => confirmMut.mutate(id) : undefined}
            onRate={user ? (id, score) => rateMut.mutate({ id, score }) : undefined}
            onRegionClick={(id, name) => {
              if (!region.cve_ent) {
                setRegion({ cve_ent: id, state_name: name, cvegeo: null, municipality_name: null });
              } else {
                setRegion({ ...region, cvegeo: id, municipality_name: name });
              }
            }}
          />
          <p className="text-[12px] text-warm">
            {region.cve_ent ? "Toca un municipio para enfocarlo." : "Toca un estado para ver sus municipios."}{" "}
            {staff
              ? "Ves todas las incidencias abiertas, también las que aún no se validan, en su ubicación real."
              : "La ubicación en el mapa está aproximada (~30 m) para no mostrar el punto exacto del reporte."}
            {incidents.isFetching ? " Actualizando esta vista…" : ""}
          </p>
          {incidents.data && incidents.data.total > fetched.length && (
            <p className="text-[12px] text-warm">
              Hay {fmtInt(incidents.data.total)} en esta vista; el mapa muestra las {fmtInt(fetched.length)} más urgentes.
            </p>
          )}
        </div>
        <aside className="space-y-4">
          <WaterPanel title={placeTitle} water={water ?? undefined} />
          <Legend />
        </aside>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-subheading">{staff ? "Todas las incidencias" : "En esta vista"}</h2>
          <div className="flex flex-wrap gap-2">
            <label>
              <span className="sr-only">Categoría</span>
              <select className="field w-auto min-w-[180px]" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrar por categoría">
                <option value="all">Todas las categorías</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Prioridad</span>
              <select className="field w-auto min-w-[140px]" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filtrar por prioridad">
                <option value="all">Todas las prioridades</option>
                {Object.entries(BAND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <Tag>{fmtInt(list.length)}</Tag>
          </div>
        </div>
        {waiting ? (
          <p className="rounded-card border border-dashed border-muted bg-card px-4 py-6 text-center text-warm">
            Cargando incidencias de esta vista…
          </p>
        ) : list.length === 0 ? (
          <p className="rounded-card border border-dashed border-muted bg-card px-4 py-6 text-center text-warm">
            {fetched.length ? "Ninguna incidencia de esta vista coincide con el filtro." : "No hay incidencias en esta vista por ahora."}
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
            {list.slice(0, 12).map((inc) => (
              <li key={inc.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  className="font-mono text-[12px] text-cyan-edge hover:underline"
                  onClick={() => setSearch({ lat: String(inc.latitude), lon: String(inc.longitude), id: inc.id })}
                  title="Ver ubicación exacta"
                >
                  {inc.public_id}
                </button>
                <span className="text-ink">{label(CATEGORY_LABELS, inc.primary_category)}</span>
                <PriorityTag band={inc.priority_band} />
                {inc.awaiting_validation && <Tag>Sin validar</Tag>}
                <span className="text-[12px] text-warm">
                  {inc.report_count} reporte(s) · {inc.confirmation_count} confirmación(es)
                </span>
                {user && (
                  <button
                    type="button"
                    className="ml-auto min-h-11 rounded-full border border-line px-4 py-2 text-[13px] hover:border-muted"
                    onClick={() => confirmMut.mutate(inc.id)}
                    disabled={confirmMut.isPending}
                  >
                    Yo también la vi
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
