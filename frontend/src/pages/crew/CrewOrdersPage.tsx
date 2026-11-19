import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/AuthContext";
import { CATEGORY_LABELS, FLOW_LABELS, fmtLiters, label } from "../../shared/labels";
import type { Incident } from "../../shared/staff/api";
import QueryError from "../../shared/ui/QueryError";
import { PageHeader, PriorityTag, Skeleton, Stat } from "../../shared/ui";

export default function CrewOrdersPage() {
  const { user } = useAuth();
  const active = useQuery({
    queryKey: ["crew-orders", "active"],
    queryFn: () => apiFetch<{ items: Incident[]; total: number }>("/incidents?status=active&page_size=50"),
    refetchInterval: 30_000,
  });
  const done = useQuery({
    queryKey: ["crew-orders", "resolved"],
    queryFn: () => apiFetch<{ items: Incident[]; total: number }>("/incidents?status=resolved&page_size=1"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>Órdenes de <span className="highlight">cuadrilla</span></>}
        lead={`${user?.display_name ?? ""} · Fugas validadas por despacho y asignadas a ti, de mayor a menor urgencia.`}
      />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Por atender" value={active.data?.total ?? "—"} />
        <Stat label="Atendidas" value={done.data?.total ?? "—"} />
      </div>
      {active.error && <QueryError error={active.error} onRetry={() => void active.refetch()} />}
      <ul className="space-y-3">
        {active.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-24" />)}
        {active.data?.items.map((i, idx) => (
          <li key={i.id} className="anim-fade" style={{ animationDelay: `${idx * 40}ms` }}>
            <Link to={`/cuadrilla/${i.id}`} className="lift block rounded-card border border-line bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] text-warm">{i.public_id}</span>
                <PriorityTag band={i.priority_band} />
                <span className="ml-auto text-[13px] text-cyan-edge">Abrir orden →</span>
              </div>
              <p className="mt-2 text-ink">
                {label(CATEGORY_LABELS, i.primary_category)}
                {i.leak_flow && <span className="text-warm"> · {label(FLOW_LABELS, i.leak_flow)}</span>}
              </p>
              <p className="text-[12px] text-warm">
                {[i.municipality_name, i.state_name].filter(Boolean).join(", ")} · Urgencia {Number(i.urgency_score).toFixed(0)}
                {i.estimated_liters != null ? ` · ${fmtLiters(i.estimated_liters)} perdidos (est.)` : ""}
              </p>
            </Link>
          </li>
        ))}
        {active.data && !active.data.items.length && (
          <li className="rounded-card border border-dashed border-muted bg-card px-4 py-10 text-center text-warm">
            No tienes órdenes pendientes. Despacho te asignará las siguientes.
          </li>
        )}
      </ul>
    </div>
  );
}
