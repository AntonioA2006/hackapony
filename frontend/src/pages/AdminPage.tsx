import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../shared/api/client";
import { useAuth } from "../shared/auth/AuthContext";
import { BAND_LABELS, CATEGORY_LABELS, INCIDENT_STATUS_LABELS, label } from "../shared/labels";
import QueryError from "../shared/ui/QueryError";
import { Button, Card, Notice, PageHeader, Stat, Tag } from "../shared/ui";

type Incident = {
  id: string;
  public_id: string;
  urgency_score: number;
  priority_band: string;
  status: string;
  report_count: number;
  confirmation_count: number;
  primary_category: string;
};

type Report = { id: string; public_id: string; title: string; status: string; category: string };

const SUMMARY_LABELS: Record<string, string> = {
  total_reports: "Reportes",
  total_incidents: "Incidencias",
  open_incidents: "Abiertas",
  critical_incidents: "Críticas",
};

export default function AdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const isAdmin = user && user.role !== "CIUDADANO";

  const summary = useQuery({
    queryKey: ["admin-summary"],
    queryFn: () => apiFetch<Record<string, number>>("/statistics/summary"),
    enabled: Boolean(isAdmin),
  });
  const priority = useQuery({
    queryKey: ["admin-priority"],
    queryFn: () => apiFetch<Incident[]>("/incidents/priority?limit=20"),
    enabled: Boolean(isAdmin),
  });
  const reports = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => apiFetch<{ items: Report[] }>("/reports?status=received"),
    enabled: Boolean(isAdmin),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-reports"] });
    void qc.invalidateQueries({ queryKey: ["admin-priority"] });
    void qc.invalidateQueries({ queryKey: ["admin-summary"] });
  };
  const onError = (e: unknown) => setMsg({ tone: "error", text: (e as Error).message });

  const reviewReport = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      apiFetch(`/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status, rejection_reason: reason }) }),
    onSuccess: () => {
      setMsg({ tone: "success", text: "Reporte actualizado." });
      refresh();
    },
    onError,
  });

  const setIncidentStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/incidents/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_d, v) => {
      setMsg({
        tone: "success",
        text:
          v.status === "resolved" || v.status === "dismissed"
            ? "Caso cerrado. Sus fotografías se eliminaron del almacenamiento."
            : "Incidencia actualizada.",
      });
      refresh();
    },
    onError,
  });

  const closeIncident = (inc: Incident, status: "resolved" | "dismissed") => {
    const verb = status === "resolved" ? "resolver" : "descartar";
    if (window.confirm(`¿Seguro que quieres ${verb} ${inc.public_id}? Se eliminarán sus fotografías de forma permanente.`)) {
      setIncidentStatus.mutate({ id: inc.id, status });
    }
  };

  const handleReject = (id: string) => {
    const reason = window.prompt("Motivo del rechazo (obligatorio, se comunica a quien reportó):");
    if (!reason || reason.trim().length < 5) {
      setMsg({ tone: "error", text: "Indica un motivo de al menos 5 caracteres." });
      return;
    }
    reviewReport.mutate({ id, status: "rejected", reason: reason.trim() });
  };

  const [cveEnt, setCveEnt] = useState("09");
  const [cveMun, setCveMun] = useState("002");
  const importAgebMun = useMutation({
    mutationFn: () => apiFetch(`/inegi/import/wscatgeo/${cveEnt}/${cveMun}/ageb`, { method: "POST" }),
    onError,
  });
  const relink = useMutation({ mutationFn: () => apiFetch("/inegi/relink-territorial", { method: "POST" }), onError });

  if (user && user.role === "CIUDADANO") return <Navigate to="/" replace />;

  return (
    <div className="space-y-10">
      <PageHeader title={<>Panel de <span className="highlight">atención</span></>} lead="Valida reportes, prioriza incidencias y cierra casos." />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {summary.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(summary.data).map(([k, v]) => (
            <Stat key={k} label={SUMMARY_LABELS[k] ?? k.replace(/_/g, " ")} value={v} />
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-subheading">Reportes por validar</h2>
        {reports.error && <QueryError error={reports.error} onRetry={() => void reports.refetch()} />}
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
          {(reports.data?.items ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="font-mono text-[12px] text-warm">{r.public_id}</span>
              <span className="min-w-[200px] flex-1 text-ink">
                {r.title} <span className="text-warm">· {label(CATEGORY_LABELS, r.category)}</span>
              </span>
              <Button variant="primary" onClick={() => reviewReport.mutate({ id: r.id, status: "validated" })}>
                Validar
              </Button>
              <Button onClick={() => handleReject(r.id)}>Rechazar</Button>
            </li>
          ))}
          {!reports.data?.items?.length && <li className="px-5 py-6 text-center text-warm">No hay reportes pendientes.</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-subheading">Cola de prioridad</h2>
        {priority.error && <QueryError error={priority.error} onRetry={() => void priority.refetch()} />}
        <div className="overflow-x-auto rounded-card border border-line bg-card">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="border-b border-line text-[12px] uppercase tracking-[0.025em] text-warm">
              <tr>
                <th className="px-4 py-3 font-medium">Folio</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Urgencia</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Reportes</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(priority.data ?? []).map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-mono text-[12px] text-warm">{i.public_id}</td>
                  <td className="px-4 py-3">{label(CATEGORY_LABELS, i.primary_category)}</td>
                  <td className="px-4 py-3">
                    <span className="tabular-nums">{Number(i.urgency_score).toFixed(1)}</span>{" "}
                    <Tag tone={i.priority_band === "critical" ? "dark" : "neutral"}>{label(BAND_LABELS, i.priority_band)}</Tag>
                  </td>
                  <td className="px-4 py-3">{label(INCIDENT_STATUS_LABELS, i.status)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {i.report_count} · {i.confirmation_count} conf.
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {i.status !== "in_progress" && (
                        <Button className="!px-3 !py-1 text-[12px]" onClick={() => setIncidentStatus.mutate({ id: i.id, status: "in_progress" })}>
                          En atención
                        </Button>
                      )}
                      <Button variant="dark" className="!px-3 !py-1 text-[12px]" onClick={() => closeIncident(i, "resolved")}>
                        Resolver
                      </Button>
                      <Button variant="quiet" className="!px-2 !py-1 text-[12px]" onClick={() => closeIncident(i, "dismissed")}>
                        Descartar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!priority.data?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-warm">
                    No hay incidencias abiertas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {user?.role === "SUPERADMINISTRADOR" && (
        <Card>
          <h2 className="text-subheading">Datos INEGI</h2>
          <p className="mt-1 text-body text-warm">
            Estados, municipios e indicadores de agua se cargan automáticamente en cada despliegue. Aquí puedes importar
            AGEB (zonas censales) de un municipio para afinar el índice de urgencia y reubicar reportes.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label>
              <span className="label">Entidad</span>
              <input className="field w-20" value={cveEnt} onChange={(e) => setCveEnt(e.target.value)} />
            </label>
            <label>
              <span className="label">Municipio</span>
              <input className="field w-24" value={cveMun} onChange={(e) => setCveMun(e.target.value)} />
            </label>
            <Button variant="dark" disabled={importAgebMun.isPending} onClick={() => importAgebMun.mutate()}>
              Importar AGEB
            </Button>
            <Button disabled={relink.isPending} onClick={() => relink.mutate()}>
              Reubicar reportes
            </Button>
          </div>
          {[importAgebMun, relink].map((m, i) =>
            m.isSuccess && m.data != null ? (
              <pre key={i} className="mt-3 overflow-x-auto rounded-input bg-canvas p-3 text-[12px]">
                {JSON.stringify(m.data as object, null, 2)}
              </pre>
            ) : null,
          )}
        </Card>
      )}
    </div>
  );
}
