import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../shared/api/client";
import { useAuth } from "../shared/auth/AuthContext";

type Incident = {
  id: string;
  public_id: string;
  urgency_score: number;
  priority_band: string;
  status: string;
  report_count: number;
};

type Report = { id: string; public_id: string; title: string; status: string };

export default function AdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  if (user && user.role === "CIUDADANO") return <Navigate to="/" replace />;

  const summary = useQuery({ queryKey: ["admin-summary"], queryFn: () => apiFetch<Record<string, number>>("/statistics/summary") });
  const priority = useQuery({ queryKey: ["admin-priority"], queryFn: () => apiFetch<Incident[]>("/incidents/priority?limit=10") });
  const reports = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => apiFetch<{ items: Report[] }>("/reports?status=received"),
  });

  const validate = useMutation({
    mutationFn: (id: string) => apiFetch(`/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status: "validated" }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-priority"] });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", rejection_reason: reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reports"] }),
  });

  const handleReject = (id: string) => {
    const reason = window.prompt("Motivo del rechazo (obligatorio):");
    if (!reason || reason.trim().length < 5) {
      window.alert("Debe indicar un motivo de al menos 5 caracteres.");
      return;
    }
    reject.mutate({ id, reason: reason.trim() });
  };

  const importInegi = useMutation({
    mutationFn: () => apiFetch("/inegi/import/wscatgeo/09", { method: "POST" }),
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Panel administrativo</h1>
      {summary.data && (
        <div className="grid gap-4 sm:grid-cols-4">
          {Object.entries(summary.data).map(([k, v]) => (
            <div key={k} className="rounded border bg-white p-3">
              <p className="text-xs uppercase text-slate-500">{k}</p>
              <p className="text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}
      <section>
        <h2 className="mb-2 text-lg font-medium">Cola de prioridad</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th>Folio</th>
              <th>Urgencia</th>
              <th>Banda</th>
              <th>Reportes</th>
            </tr>
          </thead>
          <tbody>
            {(priority.data ?? []).map((i) => (
              <tr key={i.id} className="border-b">
                <td>{i.public_id}</td>
                <td>{i.urgency_score}</td>
                <td>{i.priority_band}</td>
                <td>{i.report_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-medium">Reportes recibidos</h2>
        <ul className="space-y-2">
          {(reports.data?.items ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white p-3">
              <span>
                {r.public_id} — {r.title}
              </span>
              <div className="flex gap-2">
                <button type="button" className="rounded bg-green-600 px-2 py-1 text-white" onClick={() => validate.mutate(r.id)}>
                  Validar
                </button>
                <button type="button" className="rounded bg-red-600 px-2 py-1 text-white" onClick={() => handleReject(r.id)}>
                  Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {user?.role === "SUPERADMINISTRADOR" && (
        <section>
          <h2 className="text-lg font-medium">Datos INEGI</h2>
          <p className="mb-2 text-sm text-slate-600">
            Importación real desde wscatgeo (entidad 09 CDMX). No usa datos ficticios.
          </p>
          <button
            type="button"
            disabled={importInegi.isPending}
            className="rounded bg-slate-800 px-3 py-2 text-white"
            onClick={() => importInegi.mutate()}
          >
            Importar municipios INEGI (cve_ent=09)
          </button>
          {importInegi.isSuccess && importInegi.data != null && (
            <pre className="mt-2 rounded bg-slate-100 p-2 text-xs">
              {JSON.stringify(importInegi.data as object, null, 2)}
            </pre>
          )}
          {importInegi.error && <p className="text-red-600">{(importInegi.error as Error).message}</p>}
        </section>
      )}
    </div>
  );
}