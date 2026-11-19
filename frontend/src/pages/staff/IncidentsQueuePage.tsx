import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../shared/api/client";
import { CATEGORY_LABELS, FLOW_LABELS, INCIDENT_STATUS_LABELS, fmtLiters, label } from "../../shared/labels";
import { useStates } from "../../shared/region/api";
import type { Incident } from "../../shared/staff/api";
import QueryError from "../../shared/ui/QueryError";
import { PageHeader, PriorityTag, Skeleton, Tag } from "../../shared/ui";

const STATUS_OPTIONS = [
  ["active", "Activas"],
  ["open,triaged", "Sin atender"],
  ["in_progress", "En atención"],
  ["resolved", "Resueltas"],
  ["dismissed", "Descartadas"],
  ["", "Todas"],
] as const;

export default function IncidentsQueuePage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "active";
  const assigned = params.get("assigned") ?? "";
  const band = params.get("band") ?? "";
  const cveEnt = params.get("cve_ent") ?? "";
  const page = Number(params.get("page") ?? 1);
  const states = useStates();

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const q = new URLSearchParams({ page: String(page), page_size: "20" });
  if (status) q.set("status", status);
  if (assigned) q.set("assigned", assigned);
  if (band) q.set("band", band);
  if (cveEnt) q.set("cve_ent", cveEnt);
  const list = useQuery({
    queryKey: ["staff-incidents", q.toString()],
    queryFn: () => apiFetch<{ items: Incident[]; total: number }>(`/incidents?${q}`),
    refetchInterval: 30_000,
  });
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 20));

  return (
    <div className="space-y-6">
      <PageHeader title={<>Cola de <span className="highlight">incidencias</span></>} lead="Ordenadas por urgencia. Abre una ficha para ver reportes, fotos y atenderla." />

      <div className="grid gap-3 rounded-card border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className="label">Estado</span>
          <select className="field" value={status} onChange={(e) => set("status", e.target.value)}>
            {STATUS_OPTIONS.map(([v, l]) => (
              <option key={l} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Asignación</span>
          <select className="field" value={assigned} onChange={(e) => set("assigned", e.target.value)}>
            <option value="">Todas</option>
            <option value="me">Mis casos</option>
            <option value="none">Sin asignar</option>
          </select>
        </label>
        <label>
          <span className="label">Prioridad</span>
          <select className="field" value={band} onChange={(e) => set("band", e.target.value)}>
            <option value="">Todas</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </label>
        <label>
          <span className="label">Estado de la República</span>
          <select className="field" value={cveEnt} onChange={(e) => set("cve_ent", e.target.value)}>
            <option value="">Todo México</option>
            {states.data?.map((s) => (
              <option key={s.cve_ent} value={s.cve_ent}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.error && <QueryError error={list.error} onRetry={() => void list.refetch()} />}
      <ul className="space-y-3">
        {list.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
        {list.data?.items.map((i, idx) => (
          <li key={i.id} className="anim-fade" style={{ animationDelay: `${idx * 30}ms` }}>
            <Link to={`/panel/incidencias/${i.id}`} className="lift flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-line bg-card px-5 py-4">
              <span className="font-mono text-[12px] text-warm">{i.public_id}</span>
              <div className="min-w-[220px] flex-1">
                <p className="text-ink">
                  {label(CATEGORY_LABELS, i.primary_category)}
                  {i.leak_flow && <span className="text-warm"> · {label(FLOW_LABELS, i.leak_flow)}</span>}
                </p>
                <p className="text-[12px] text-warm">
                  {[i.municipality_name, i.state_name].filter(Boolean).join(", ") || "Sin región"} · {i.report_count} reporte(s) ·{" "}
                  {i.estimated_liters != null ? `${fmtLiters(i.estimated_liters)} perdidos (est.)` : "sin tipo de fuga"}
                </p>
              </div>
              <PriorityTag band={i.priority_band} />
              {!i.validated && <Tag>Sin validar</Tag>}
              <Tag tone={i.status === "in_progress" ? "accent" : i.status === "resolved" ? "accent" : "neutral"}>{label(INCIDENT_STATUS_LABELS, i.status)}</Tag>
              <span className="w-36 truncate text-right text-[12px] text-warm">{i.assigned_to ? `👷 ${i.assigned_to.display_name}` : "Sin asignar"}</span>
            </Link>
          </li>
        ))}
        {list.data && !list.data.items.length && (
          <li className="rounded-card border border-dashed border-muted bg-card px-4 py-8 text-center text-warm">No hay incidencias con estos filtros.</li>
        )}
      </ul>
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Paginación">
          <button type="button" className="rounded-full border border-line px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => set("page", String(page - 1))}>
            Anterior
          </button>
          <span className="text-[13px] text-warm">
            Página {page} de {pages}
          </span>
          <button type="button" className="rounded-full border border-line px-3 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => set("page", String(page + 1))}>
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}
