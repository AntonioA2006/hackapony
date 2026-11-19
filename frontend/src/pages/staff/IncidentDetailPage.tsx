import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../../shared/api/client";
import { useAuth } from "../../shared/auth/AuthContext";
import { CATEGORY_LABELS, FLOW_LABELS, INCIDENT_STATUS_LABELS, REPORT_STATUS_LABELS, SEVERITY_LABELS, fmtLiters, label } from "../../shared/labels";
import IncidentsMap from "../../shared/map/IncidentsMap";
import { isSupervisor } from "../../shared/roles";
import AuthImage from "../../shared/staff/AuthImage";
import { useTechnicians, type IncidentDetail } from "../../shared/staff/api";
import QueryError from "../../shared/ui/QueryError";
import { Button, ButtonLink, Card, Notice, PriorityTag, Skeleton, StatusTag, Tag } from "../../shared/ui";

const EVENT_LABELS: Record<string, string> = {
  report_linked: "Reporte vinculado",
  status_changed: "Cambio de estado",
  assigned: "Asignada",
  unassigned: "Liberada",
  confirmation: "Confirmación ciudadana",
  photos_purged: "Fotos eliminadas al cerrar",
  severity_changed: "Gravedad ajustada",
  flow_changed: "Tipo de fuga ajustado",
  reports_validated: "Reportes validados por despacho",
};

export default function IncidentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const supervisor = isSupervisor(user?.role);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const detail = useQuery({ queryKey: ["incident-detail", id], queryFn: () => apiFetch<IncidentDetail>(`/incidents/${id}/detail`) });
  const techs = useTechnicians(true);
  const [dispatchTo, setDispatchTo] = useState("");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["incident-detail", id] });
    void qc.invalidateQueries({ queryKey: ["staff-incidents"] });
    void qc.invalidateQueries({ queryKey: ["staff-dashboard"] });
    void qc.invalidateQueries({ queryKey: ["incidents-by-region"] });
  };
  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch(`/incidents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_d, body) => {
      const st = body.status as string | undefined;
      setMsg({
        tone: "success",
        text:
          st === "resolved" || st === "dismissed"
            ? "Caso cerrado: se avisó a quien reportó y se eliminaron las fotos."
            : body.assigned_to_id
              ? "Validada y enviada a la cuadrilla: ya ve la ubicación exacta y los detalles."
              : "Incidencia actualizada.",
      });
      refresh();
    },
    onError: (e) => setMsg({ tone: "error", text: (e as Error).message }),
  });
  const review = useMutation({
    mutationFn: ({ rid, status, reason }: { rid: string; status: string; reason?: string }) =>
      apiFetch(`/reports/${rid}`, { method: "PATCH", body: JSON.stringify({ status, rejection_reason: reason }) }),
    onSuccess: () => {
      setMsg({ tone: "success", text: "Reporte revisado." });
      refresh();
    },
    onError: (e) => setMsg({ tone: "error", text: (e as Error).message }),
  });

  if (detail.isLoading) return <Skeleton className="h-96" />;
  if (detail.error) return <QueryError error={detail.error} onRetry={() => void detail.refetch()} />;
  const { incident: inc, reports, history, photos_purged_at } = detail.data!;
  const closed = inc.status === "resolved" || inc.status === "dismissed";
  const crews = (techs.data ?? []).filter((t) => t.role === "CUADRILLA");

  const close = (status: "resolved" | "dismissed") => {
    if (window.confirm(`¿${status === "resolved" ? "Resolver" : "Descartar"} ${inc.public_id}? Se avisará a quien reportó y las fotos se eliminarán de forma permanente.`)) {
      patch.mutate({ status });
    }
  };

  return (
    <div className="space-y-6">
      <nav className="text-[13px] text-warm">
        <Link to="/panel/incidencias" className="hover:text-ink">
          ← Cola de incidencias
        </Link>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[12px] text-warm">{inc.public_id}</p>
          <h1 className="text-heading-sm">{label(CATEGORY_LABELS, inc.primary_category)}</h1>
          <p className="mt-1 text-body-lg text-warm">{[inc.municipality_name, inc.state_name].filter(Boolean).join(", ") || "Sin región"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <PriorityTag band={inc.priority_band} />
            <Tag tone="accent">{label(INCIDENT_STATUS_LABELS, inc.status)}</Tag>
            {!inc.validated && <Tag>Sin validar</Tag>}
            {inc.leak_flow && <Tag>{label(FLOW_LABELS, inc.leak_flow)}</Tag>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!closed && <Button onClick={() => close("dismissed")}>Descartar</Button>}
          {!closed && supervisor && (
            <Button variant="dark" onClick={() => close("resolved")}>
              Cerrar como atendida
            </Button>
          )}
          {closed && supervisor && <Button onClick={() => patch.mutate({ status: "open" })}>Reabrir</Button>}
        </div>
      </header>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!closed && (
        <section className="anim-pop rounded-card border border-cyan/30 bg-sky/30 p-5">
          <h2 className="text-subheading">{inc.assigned_to ? "En atención por cuadrilla" : "Validar y enviar a cuadrilla"}</h2>
          <p className="mt-1 text-body text-warm">
            {inc.assigned_to
              ? `Asignada a ${inc.assigned_to.display_name}. La cuadrilla ve la ubicación exacta, las fotos y el teléfono de contacto, y la marca como atendida al terminar.`
              : "Revisa los reportes y las fotos. Al enviar, los reportes pendientes quedan validados y la cuadrilla recibe la ubicación y los detalles."}
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="min-w-[240px] flex-1">
              <span className="label">Cuadrilla</span>
              <select className="field" value={dispatchTo} onChange={(e) => setDispatchTo(e.target.value)}>
                <option value="">{crews.length ? "Elige una cuadrilla" : "No hay cuadrillas: pide a supervisión que asigne el rol"}</option>
                {crews.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name} · {t.open_assigned} en curso
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="primary"
              disabled={!dispatchTo || patch.isPending}
              onClick={() => patch.mutate({ assigned_to_id: dispatchTo, validate_reports: true })}
            >
              {inc.assigned_to ? "Reasignar" : "Validar y enviar"}
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <IncidentsMap className="h-[380px]" incidents={[inc]} focus={{ lat: inc.latitude, lon: inc.longitude, id: inc.id }} />
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-warm">
            <span className="font-mono">
              {inc.latitude.toFixed(5)}, {inc.longitude.toFixed(5)}
            </span>
            <a className="text-cyan-edge hover:underline" href={`https://www.google.com/maps/dir/?api=1&destination=${inc.latitude},${inc.longitude}`} target="_blank" rel="noreferrer">
              Cómo llegar ↗
            </a>
            <ButtonLink to={`/mapa?lat=${inc.latitude}&lon=${inc.longitude}&id=${inc.id}`} variant="quiet">
              Ver en el mapa general
            </ButtonLink>
          </div>
        </div>
        <Card>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
            <dt className="text-warm">Urgencia</dt>
            <dd className="text-right tabular-nums">{Number(inc.urgency_score).toFixed(1)} / 100</dd>
            <dt className="text-warm">Gravedad</dt>
            <dd className="text-right">{label(SEVERITY_LABELS, inc.aggregated_severity)}</dd>
            <dt className="text-warm">Reportes · confirmaciones</dt>
            <dd className="text-right tabular-nums">
              {inc.report_count} · {inc.confirmation_count}
            </dd>
            <dt className="text-warm">Agua perdida (estimada)</dt>
            <dd className="text-right">{inc.estimated_liters != null ? fmtLiters(inc.estimated_liters) : "Sin tipo de fuga"}</dd>
            <dt className="text-warm">Abierta</dt>
            <dd className="text-right">{inc.opened_at ? new Date(inc.opened_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—"}</dd>
            {inc.closed_at && (
              <>
                <dt className="text-warm">Cerrada</dt>
                <dd className="text-right">{new Date(inc.closed_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</dd>
              </>
            )}
            <dt className="text-warm">Asignada a</dt>
            <dd className="text-right">{inc.assigned_to?.display_name ?? "Nadie"}</dd>
          </dl>
          {!closed && (
            <label className="mt-4 block">
              <span className="label">Tipo de fuga observado</span>
              <select className="field" value={inc.leak_flow ?? ""} onChange={(e) => e.target.value && patch.mutate({ leak_flow: e.target.value })}>
                <option value="">Sin dato</option>
                <option value="goteo">Goteo (~5 L/h)</option>
                <option value="chorro">Chorro (~600 L/h)</option>
                <option value="inundacion">Inundación (~6,000 L/h)</option>
              </select>
            </label>
          )}
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-subheading">Reportes ciudadanos ({reports.length})</h2>
        {photos_purged_at && <Notice>Las fotos se eliminaron al cerrar el caso ({new Date(photos_purged_at).toLocaleDateString("es-MX")}).</Notice>}
        <ul className="mt-3 space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-card border border-line bg-card p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-[220px] flex-1">
                  <p className="font-mono text-[12px] text-warm">
                    {r.public_id} · {new Date(r.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })} · {r.reporter}
                  </p>
                  <p className="mt-1 font-medium text-ink">{r.title}</p>
                  <p className="mt-1 text-body text-warm">{r.description}</p>
                  <p className="mt-2 text-[12px] text-warm">
                    {label(SEVERITY_LABELS, r.severity)} · {r.leak_flow ? label(FLOW_LABELS, r.leak_flow) : "tipo de fuga sin dato"}
                    {r.address_reference ? ` · ${r.address_reference}` : ""}
                  </p>
                </div>
                <StatusTag status={r.status} />
              </div>
              {r.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {r.photos.map((p, i) => (
                    <AuthImage key={p.id} reportId={r.id} photoId={p.id} alt={`Foto ${i + 1} del reporte ${r.public_id}`} />
                  ))}
                </div>
              )}
              {(r.status === "received" || r.status === "under_review") && (
                <div className="mt-4 flex gap-2">
                  <Button variant="primary" onClick={() => review.mutate({ rid: r.id, status: "validated" })}>
                    Validar
                  </Button>
                  <Button
                    onClick={() => {
                      const reason = window.prompt("Motivo del rechazo (se comunica a quien reportó):");
                      if (reason && reason.trim().length >= 5) review.mutate({ rid: r.id, status: "rejected", reason: reason.trim() });
                      else if (reason !== null) setMsg({ tone: "error", text: "El motivo debe tener al menos 5 caracteres." });
                    }}
                  >
                    Rechazar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-subheading">Historial</h2>
        <ol className="relative space-y-3 border-l border-line pl-5">
          {history.map((h, i) => (
            <li key={i} className="anim-fade text-[13px]">
              <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-cyan" aria-hidden />
              <span className="text-ink">{EVENT_LABELS[h.type] ?? h.type}</span>
              {h.type === "status_changed" && h.payload && (
                <span className="text-warm">
                  {" "}
                  · {label(INCIDENT_STATUS_LABELS, String(h.payload.from))} → {label(INCIDENT_STATUS_LABELS, String(h.payload.to))}
                </span>
              )}
              <span className="text-warm">
                {" "}
                · {h.actor ?? "Sistema"} · {new Date(h.at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[12px] text-ash">Estados del reporte ciudadano: {Object.values(REPORT_STATUS_LABELS).join(" · ")}</p>
      </section>
    </div>
  );
}
