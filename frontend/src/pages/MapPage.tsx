import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LatLngBoundsExpression } from "leaflet";
import { useMemo, useState } from "react";
import { apiFetch } from "../shared/api/client";
import { useAuth } from "../shared/auth/AuthContext";
import { BAND_LABELS, CATEGORY_LABELS, fmtInt, fmtPct, label } from "../shared/labels";
import IncidentsMap, { MEXICO_BOUNDS, type MapIncident } from "../shared/map/IncidentsMap";
import { BAND_COLORS, WATER_LEGEND } from "../shared/map/waterScale";
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

  const incidents = useQuery({
    queryKey: ["public-incidents", bbox],
    enabled: typeof bbox === "string",
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ bbox: bbox as string, page_size: "200" });
      return apiFetch<Paginated<MapIncident>>(`/incidents/public?${params}`, { signal });
    },
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/incidents/${id}/confirm`, { method: "POST" }),
    onSuccess: () => {
      setNotice({ tone: "success", text: "Gracias: tu confirmación ayuda a priorizar la atención." });
      void qc.invalidateQueries({ queryKey: ["public-incidents"] });
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
  const list = incidents.data?.items ?? [];
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
          <IncidentsMap
            incidents={list}
            regions={region.cve_ent ? munGeo.data : statesGeo.data}
            selectedRegionId={region.cve_ent ? region.cvegeo : null}
            bounds={bounds}
            onViewportChange={setBbox}
            onConfirm={user ? (id) => confirmMut.mutate(id) : undefined}
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
            Solo se publican incidencias con al menos un reporte validado. La ubicación en el mapa está aproximada (~30 m)
            para no mostrar el punto exacto del reporte.
            {incidents.isFetching ? " Actualizando esta vista…" : ""}
          </p>
          {incidents.data && incidents.data.total > list.length && (
            <p className="text-[12px] text-warm">
              Hay {fmtInt(incidents.data.total)} en esta vista; el mapa muestra las {fmtInt(list.length)} más urgentes.
            </p>
          )}
        </div>
        <aside className="space-y-4">
          <WaterPanel title={placeTitle} water={water ?? undefined} />
          <Legend />
        </aside>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-subheading">En esta vista</h2>
          <Tag>{fmtInt(incidents.data?.total ?? 0)}</Tag>
        </div>
        {waiting ? (
          <p className="rounded-card border border-dashed border-muted bg-card px-4 py-6 text-center text-warm">
            Cargando incidencias de esta vista…
          </p>
        ) : list.length === 0 ? (
          <p className="rounded-card border border-dashed border-muted bg-card px-4 py-6 text-center text-warm">
            No hay incidencias validadas en esta vista por ahora.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
            {list.slice(0, 12).map((inc) => (
              <li key={inc.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="font-mono text-[12px] text-warm">{inc.public_id}</span>
                <span className="text-ink">{label(CATEGORY_LABELS, inc.primary_category)}</span>
                <PriorityTag band={inc.priority_band} />
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
