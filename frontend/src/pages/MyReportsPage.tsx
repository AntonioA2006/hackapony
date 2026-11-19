import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../shared/api/client";
import { CATEGORY_LABELS, label } from "../shared/labels";
import QueryError from "../shared/ui/QueryError";
import { ButtonLink, PageHeader, Spinner, StatusTag } from "../shared/ui";

type Report = {
  id: string;
  public_id: string;
  title: string;
  status: string;
  category: string;
  created_at: string;
  incident_id: string | null;
};

export default function MyReportsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => apiFetch<{ items: Report[] }>("/users/me/reports"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>Mis <span className="highlight">reportes</span></>}
        lead="El estado de cada reporte que has enviado."
        actions={<ButtonLink to="/reportar" variant="primary">Nuevo reporte</ButtonLink>}
      />
      {isLoading && <Spinner />}
      {error && <QueryError error={error} onRetry={() => void refetch()} />}
      {data && (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
          {data.items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
              <span className="font-mono text-[12px] text-warm">{r.public_id}</span>
              <div className="min-w-[200px] flex-1">
                <p className="text-ink">{r.title}</p>
                <p className="text-[12px] text-warm">
                  {label(CATEGORY_LABELS, r.category)} · {new Date(r.created_at).toLocaleDateString("es-MX", { dateStyle: "medium" })}
                  {r.incident_id ? " · agrupado en una incidencia" : ""}
                </p>
              </div>
              <StatusTag status={r.status} />
            </li>
          ))}
          {!data.items.length && <li className="px-5 py-8 text-center text-warm">Aún no has enviado reportes.</li>}
        </ul>
      )}
    </div>
  );
}
