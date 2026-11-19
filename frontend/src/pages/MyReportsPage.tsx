import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../shared/api/client";
import { CATEGORY_LABELS, FLOW_LABELS, label } from "../shared/labels";
import QueryError from "../shared/ui/QueryError";
import { ButtonLink, PageHeader, Skeleton, StatusTag } from "../shared/ui";
import SatisfactionSurvey from "../shared/ui/SatisfactionSurvey";

type Report = {
  id: string;
  public_id: string;
  title: string;
  status: string;
  category: string;
  created_at: string;
  incident_id: string | null;
  incident_status: string | null;
  latitude: number;
  longitude: number;
  address_reference: string | null;
  leak_flow: string | null;
};

const STEPS = [
  { key: "received", label: "Recibido" },
  { key: "validated", label: "Validado" },
  { key: "in_progress", label: "En atención" },
  { key: "resolved", label: "Resuelto" },
];
const STEP_INDEX: Record<string, number> = { received: 0, under_review: 0, validated: 1, in_progress: 2, resolved: 3 };

function Progress({ status }: { status: string }) {
  if (status === "rejected") return <p className="text-[12px] text-critical">Rechazado por el personal: revisa el aviso en tu tablero.</p>;
  const at = STEP_INDEX[status] ?? 0;
  return (
    <ol className="flex items-center gap-1" aria-label={`Progreso: ${STEPS[at].label}`}>
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex flex-1 items-center gap-1">
          <span
            className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i <= at ? (at === 3 ? "bg-ok" : "bg-cyan") : "bg-line"}`}
            title={s.label}
          />
          {i === at && <span className="whitespace-nowrap text-[11px] text-warm">{s.label}</span>}
        </li>
      ))}
    </ol>
  );
}

export default function MyReportsPage() {
  const qc = useQueryClient();
  const rate = useMutation({
    mutationFn: ({ id, score }: { id: string; score: number }) =>
      apiFetch(`/incidents/${id}/satisfaction`, { method: "POST", body: JSON.stringify({ score }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["public-stats"] }),
  });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => apiFetch<{ items: Report[] }>("/users/me/reports"),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>Mis <span className="highlight">reportes</span></>}
        lead="El estado de cada reporte. Si ya está resuelto, puedes contestar la encuesta de satisfacción."
        actions={<ButtonLink to="/reportar" variant="primary">Nuevo reporte</ButtonLink>}
      />
      {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
      {error && <QueryError error={error} onRetry={() => void refetch()} />}
      {data && (
        <ul className="space-y-3">
          {data.items.map((r, idx) => (
            <li key={r.id} className="anim-fade" style={{ animationDelay: `${idx * 40}ms` }}>
              <Link
                to={`/mapa?lat=${r.latitude}&lon=${r.longitude}${r.incident_id ? `&id=${r.incident_id}` : ""}`}
                className="lift block rounded-card border border-line bg-card px-5 py-4"
              >
                <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
                  <span className="font-mono text-[12px] text-warm">{r.public_id}</span>
                  <div className="min-w-[200px] flex-1">
                    <p className="text-ink">{r.title}</p>
                    <p className="text-[12px] text-warm">
                      {label(CATEGORY_LABELS, r.category)}
                      {r.leak_flow ? ` · ${label(FLOW_LABELS, r.leak_flow)}` : ""} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("es-MX", { dateStyle: "medium" })}
                    </p>
                    {r.address_reference && <p className="text-[12px] text-warm">{r.address_reference}</p>}
                  </div>
                  <StatusTag status={r.status} />
                  <span className="text-[12px] text-cyan-edge">Ver en el mapa →</span>
                </div>
                <div className="mt-3">
                  <Progress status={r.status} />
                </div>
              </Link>
              {r.incident_id && r.status === "resolved" && (
                <SatisfactionSurvey pending={rate.isPending} onSubmit={(score) => rate.mutate({ id: r.incident_id!, score })} />
              )}
            </li>
          ))}
          {!data.items.length && (
            <li className="rounded-card border border-dashed border-muted bg-card px-5 py-8 text-center text-warm">
              Aún no has enviado reportes. <Link to="/reportar" className="text-cyan-edge underline">Reporta el primero</Link>.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
