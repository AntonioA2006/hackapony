import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PhoneIcon, PinIcon } from "../../shared/ui/icons";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../shared/api/client";
import { fmtDistance, getBrowserPosition, GeoError, haversineMeters } from "../../shared/geo";
import { CATEGORY_LABELS, FLOW_LABELS, SEVERITY_LABELS, fmtLiters, label } from "../../shared/labels";
import IncidentsMap from "../../shared/map/IncidentsMap";
import AuthImage from "../../shared/staff/AuthImage";
import type { IncidentDetail } from "../../shared/staff/api";
import QueryError from "../../shared/ui/QueryError";
import { Button, Card, Notice, PriorityTag, Skeleton } from "../../shared/ui";
import PhotoCapture from "../../shared/ui/PhotoCapture";

export default function CrewOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [me, setMe] = useState<[number, number] | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [minutes, setMinutes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const detail = useQuery({ queryKey: ["incident-detail", id], queryFn: () => apiFetch<IncidentDetail>(`/incidents/${id}/detail`) });

  const locate = () => {
    setGeoMsg(null);
    getBrowserPosition()
      .then((p) => setMe([p.lat, p.lon]))
      .catch((e) => setGeoMsg(e instanceof GeoError ? e.message : "No se pudo obtener tu ubicación."));
  };
  useEffect(locate, []);

  const close = useMutation({
    mutationFn: () => {
      const body = new FormData();
      body.set("description", note.trim());
      body.set("minutes_spent", String(Number(minutes)));
      if (photo) body.set("file", photo);
      return apiFetch(`/incidents/${id}/resolution`, { method: "POST", body });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crew-orders"] });
      setMsg({ tone: "success", text: "Enviado al operador. Quien reportó ya lo ve resuelto; la foto no es visible para esa persona." });
      setTimeout(() => navigate("/cuadrilla"), 2200);
    },
    onError: (e) => setMsg({ tone: "error", text: (e as Error).message }),
  });

  if (detail.isLoading) return <Skeleton className="h-96" />;
  if (detail.error) return <QueryError error={detail.error} onRetry={() => void detail.refetch()} />;
  const { incident: inc, reports } = detail.data!;
  const target: [number, number] = [inc.latitude, inc.longitude];
  const distance = me ? haversineMeters(me, target) : null;
  const phones = [...new Set(reports.map((r) => r.contact_phone).filter(Boolean) as string[])];
  const closed = inc.status === "resolved" || inc.status === "dismissed" || inc.status === "pending_verification";
  const sent = inc.status === "pending_verification" || inc.status === "resolved";
  const coords = `${inc.latitude.toFixed(6)}, ${inc.longitude.toFixed(6)}`;

  return (
    <div className="space-y-5 pb-28">
      <Link to="/cuadrilla" className="text-[13px] text-warm hover:text-ink">
        ← Mis órdenes
      </Link>
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] text-warm">{inc.public_id}</span>
          <PriorityTag band={inc.priority_band} />
        </div>
        <h1 className="mt-1 text-heading-sm">{label(CATEGORY_LABELS, inc.primary_category)}</h1>
        <p className="text-body-lg text-warm">{[inc.municipality_name, inc.state_name].filter(Boolean).join(", ")}</p>
      </header>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <IncidentsMap className="h-[44vh] min-h-[260px]" incidents={[inc]} route={me ? { from: me, to: target } : null} focus={me ? null : { lat: inc.latitude, lon: inc.longitude, id: inc.id }} />

      <Card>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <p className="text-warm">Distancia directa</p>
            <p className="font-display text-subheading tabular-nums">{distance != null ? fmtDistance(distance) : "—"}</p>
          </div>
          <div>
            <p className="text-warm">Coordenadas</p>
            <p className="font-mono text-[13px] text-ink">{coords}</p>
          </div>
        </div>
        {geoMsg && <p className="mt-2 text-[12px] text-warm">{geoMsg}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <a
            className="press inline-flex min-h-[44px] items-center justify-center rounded-full border border-cyan-edge bg-cyan px-4 text-body font-medium text-white"
            href={`https://www.google.com/maps/dir/?api=1&destination=${inc.latitude},${inc.longitude}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
          >
            Navegar
          </a>
          <Button className="min-h-[44px]" onClick={() => void navigator.clipboard?.writeText(coords).then(() => setMsg({ tone: "success", text: "Coordenadas copiadas." }))}>
            Copiar coordenadas
          </Button>
          <Button className="min-h-[44px]" onClick={locate}>
            Actualizar mi GPS
          </Button>
          {phones[0] ? (
            <a className="press inline-flex min-h-[44px] items-center justify-center rounded-full border border-soot bg-soot px-4 text-body font-medium text-white" href={`tel:+52${phones[0]}`}>
              <PhoneIcon size={18} /> Llamar a quien reportó
            </a>
          ) : (
            <span className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-dashed border-muted px-3 text-center text-[12px] text-ash">Sin teléfono de contacto</span>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-subheading">Detalle reportado</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          <dt className="text-warm">Gravedad</dt>
          <dd className="text-right">{label(SEVERITY_LABELS, inc.aggregated_severity)}</dd>
          <dt className="text-warm">Tipo de fuga</dt>
          <dd className="text-right">{inc.leak_flow ? label(FLOW_LABELS, inc.leak_flow) : "Sin dato"}</dd>
          <dt className="text-warm">Agua perdida (estimada)</dt>
          <dd className="text-right">{fmtLiters(inc.estimated_liters)}</dd>
          <dt className="text-warm">Reportes</dt>
          <dd className="text-right">{inc.report_count}</dd>
        </dl>
        <ul className="mt-4 space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-input border border-line p-3">
              <p className="text-ink">{r.title}</p>
              <p className="text-[13px] text-warm">{r.description}</p>
              {r.address_reference && <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-warm"><PinIcon size={14} /> {r.address_reference}</p>}
              {r.photos.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {r.photos.map((p, i) => (
                    <AuthImage key={p.id} reportId={r.id} photoId={p.id} alt={`Foto ${i + 1} de ${r.public_id}`} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {sent && (
        <Notice tone="success">
          {inc.status === "pending_verification"
            ? "El operador debe verificar este cierre. Quien reportó ya lo ve como resuelto."
            : "El operador confirmó el cierre."}
        </Notice>
      )}
      {!closed && (
        <Card>
          <h2 className="text-subheading">Dar por resuelta</h2>
          <p className="mt-1 text-body text-warm">Foto de la reparación, qué se hizo y cuánto tiempo tomó. Eso se envía al operador. Quien reportó no ve la foto.</p>
          <div className="mt-4">
            <p className="label">Foto de cómo quedó</p>
            <PhotoCapture id="cierre-foto" files={photo ? [photo] : []} max={1} onChange={(files) => setPhoto(files[0] ?? null)} />
          </div>
          <label className="mt-3 block">
            <span className="label">Cómo se resolvió</span>
            <textarea className="field min-h-24" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Qué se reparó y con qué" />
          </label>
          <label className="mt-3 block">
            <span className="label">Tiempo empleado (minutos)</span>
            <input className="field" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} placeholder="45" />
          </label>
          <Button
            variant="primary"
            className="mt-4 min-h-[48px] w-full"
            disabled={close.isPending || !photo || note.trim().length < 10 || !minutes}
            onClick={() => close.mutate()}
          >
            {close.isPending ? "Enviando…" : "Enviar a verificación"}
          </Button>
        </Card>
      )}
    </div>
  );
}
