import { useMemo, useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext";
import { BarList, ChartCard, SegmentedBar, TrendChart } from "../../shared/charts";
import { BAND_LABELS, CATEGORY_LABELS, FLOW_LABELS, fmtHours, fmtLiters, label } from "../../shared/labels";
import IncidentsMap from "../../shared/map/IncidentsMap";
import { BAND_COLORS, INCIDENT_LEGEND, regionIncidentColor } from "../../shared/map/waterScale";
import { useMunicipalities, useMunicipalitiesGeo, useStates, useStatesGeo } from "../../shared/region/api";
import { isSupervisor, ROLE_LABELS } from "../../shared/roles";
import { useDashboard, useRegionCounts } from "../../shared/staff/api";
import QueryError from "../../shared/ui/QueryError";
import { ButtonLink, CountUp, PageHeader, Skeleton, Stat } from "../../shared/ui";

const PERIODS = [7, 30, 90, 365];

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const [cveEnt, setCveEnt] = useState<string | null>(null);
  const [cvegeo, setCvegeo] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const states = useStates();
  const municipalities = useMunicipalities(cveEnt);
  const dash = useDashboard(cveEnt, days, cvegeo, category);
  const counts = useRegionCounts(cveEnt);
  const statesGeo = useStatesGeo();
  const munGeo = useMunicipalitiesGeo(cveEnt);
  const d = dash.data;
  const t = d?.totals;

  const regionColors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of counts.data?.items ?? []) {
      const c = regionIncidentColor(r);
      if (c) out[r.id] = c;
    }
    return out;
  }, [counts.data]);
  const stateBox = states.data?.find((s) => s.cve_ent === cveEnt)?.bbox;
  const bounds = stateBox ? ([[stateBox[1], stateBox[0]], [stateBox[3], stateBox[2]]] as [[number, number], [number, number]]) : null;
  const scopeName = cveEnt ? states.data?.find((s) => s.cve_ent === cveEnt)?.name : "todo México";

  const flows = (d?.by_flow ?? []).map((f) => ({
    key: f.key,
    label: label(FLOW_LABELS, f.key),
    value: f.liters,
    note: `${f.total} incidencia(s)${d?.flow_rates_lph[f.key] ? ` · ~${d.flow_rates_lph[f.key].toLocaleString("es-MX")} L/h` : ""}`,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <>
            Panel de <span className="highlight">{isSupervisor(user?.role) ? "supervisión" : "atención"}</span>
          </>
        }
        lead={`${ROLE_LABELS[user?.role ?? ""] ?? ""} · Métricas de ${scopeName} en los últimos ${days} días. Se actualiza cada minuto.`}
        actions={
          <>
            <ButtonLink to="/panel/incidencias">Cola de incidencias</ButtonLink>
            <ButtonLink to="/panel/incidencias?assigned=me" variant="primary">
              Mis casos
            </ButtonLink>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-card p-4">
        <label className="min-w-[220px]">
          <span className="label">Área · estado</span>
          <select
            className="field"
            value={cveEnt ?? ""}
            onChange={(e) => {
              setCveEnt(e.target.value || null);
              setCvegeo(null);
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
        <label className="min-w-[220px]">
          <span className="label">Área · municipio</span>
          <select className="field" value={cvegeo ?? ""} disabled={!cveEnt} onChange={(e) => setCvegeo(e.target.value || null)}>
            <option value="">{cveEnt ? "Todo el estado" : "Elige un estado"}</option>
            {municipalities.data?.map((m) => (
              <option key={m.cvegeo} value={m.cvegeo}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[220px]">
          <span className="label">Tipo de incidencia</span>
          <select className="field" value={category ?? ""} onChange={(e) => setCategory(e.target.value || null)}>
            <option value="">Todas</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="label">Periodo</span>
          <div className="flex gap-1" role="group" aria-label="Periodo">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={days === p}
                onClick={() => setDays(p)}
                className={`press rounded-full border px-3 py-1.5 text-[13px] ${days === p ? "border-soot bg-soot text-white" : "border-line bg-card text-ink hover:border-muted"}`}
              >
                {p === 365 ? "1 año" : `${p} días`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {dash.error && <QueryError error={dash.error} onRetry={() => void dash.refetch()} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {t ? (
          <>
            <Stat label="Abiertas" value={<CountUp value={t.open} />} note={`${t.unassigned} sin asignar · ${t.critical_open} críticas`} />
            <Stat label="En atención" value={<CountUp value={t.in_progress} />} note={`Mis casos abiertos: ${t.mine_open}`} />
            <Stat label="Por verificar" value={<CountUp value={t.awaiting_verification ?? 0} />} note="La cuadrilla ya las marcó resueltas" />
            <Stat label="Resueltas" value={<CountUp value={t.resolved} />} note={`Tiempo medio: ${fmtHours(t.avg_resolution_h)} · mías: ${t.mine_resolved}`} />
            <Stat
              label="Agua perdida (estimada)"
              value={<CountUp value={t.liters_open + t.liters_resolved} format={fmtLiters} />}
              note={`${fmtLiters(t.liters_open)} en casos abiertos`}
            />
          </>
        ) : (
          [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[108px]" />)
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="lift rounded-card border border-line bg-card p-5">
          <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-medium">Mapa de incidencias activas</h3>
              <p className="text-[12px] text-warm">Las regiones se aclaran a medida que se resuelven los casos. Toca un estado para filtrar.</p>
            </div>
          </header>
          <IncidentsMap
            className="h-[380px]"
            regions={cveEnt ? munGeo.data : statesGeo.data}
            regionColors={regionColors}
            bounds={bounds}
            onRegionClick={(id) => !cveEnt && setCveEnt(id)}
          />
          <ul className="mt-3 flex flex-wrap gap-4 text-[12px] text-warm">
            {INCIDENT_LEGEND.map((l) => (
              <li key={l.label} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: l.color }} /> {l.label}
              </li>
            ))}
          </ul>
        </section>
        <ChartCard
          title="Incidencias activas por prioridad"
          note="Prioridad = gravedad + caudal + corroboración + población + tiempo sin atención (crítica o inundación nunca baja de alta)"
          table={{ columns: ["Prioridad", "Activas"], rows: (["critical", "high", "medium", "low"] as const).map((b) => [BAND_LABELS[b], d?.by_band.find((x) => x.key === b)?.total ?? 0]) }}
        >
          <SegmentedBar
            parts={(["critical", "high", "medium", "low"] as const).map((b) => ({
              key: b,
              label: BAND_LABELS[b],
              value: d?.by_band.find((x) => x.key === b)?.total ?? 0,
              color: BAND_COLORS[b],
            }))}
          />
          <div className="mt-6">
            <h4 className="mb-3 text-[13px] font-medium text-ink">Desperdicio estimado por tipo de fuga</h4>
            <BarList data={flows} format={fmtLiters} empty="Aún no hay fugas con tipo registrado." />
            <p className="mt-2 text-[11px] text-ash">
              Caudales de referencia: goteo ~5 L/h, chorro ~600 L/h, inundación ~6,000 L/h × horas abierta (máx. 30 días). Estimación, no medición.
            </p>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Abiertas vs. resueltas por día"
        table={{ columns: ["Día", "Abiertas", "Resueltas"], rows: (d?.timeline ?? []).map((r) => [r.day, r.opened, r.resolved]) }}
      >
        {d ? <TrendChart data={d.timeline} /> : <Skeleton className="h-[200px]" />}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={cveEnt ? "Incidencias por municipio" : "Incidencias por estado"}
          note="Porcentaje del total del periodo y región (las 12 con más casos)"
          table={{ columns: ["Área", "Total", "Activas", "%"], rows: (d?.by_area ?? []).map((a) => [a.name, a.total, a.active, a.pct]) }}
        >
          <BarList
            data={(d?.by_area ?? []).map((a) => ({ key: a.id ?? a.name, label: a.name, value: a.total, note: `${a.pct} % · ${a.active} activas` }))}
            format={(n) => `${n.toLocaleString("es-MX")} · ${(((d?.totals.total ?? 0) ? (100 * n) / d!.totals.total : 0)).toLocaleString("es-MX", { maximumFractionDigits: 1 })} %`}
          />
        </ChartCard>
        <ChartCard title="Incidencias por tipo de problema" table={{ columns: ["Tipo", "Total"], rows: (d?.by_category ?? []).map((c) => [label(CATEGORY_LABELS, c.key), c.total]) }}>
          <BarList data={(d?.by_category ?? []).map((c) => ({ key: c.key, label: label(CATEGORY_LABELS, c.key), value: c.total }))} />
        </ChartCard>
      </div>
    </div>
  );
}
