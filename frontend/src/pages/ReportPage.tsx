import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import CallButtons from "../shared/CallButtons";
import { useAuth } from "../shared/auth/AuthContext";
import { apiFetch, authHeader, getApiBase } from "../shared/api/client";
import { CATEGORY_LABELS, FLOW_RATE_LPH, SEVERITY_LABELS } from "../shared/labels";
import IncidentsMap from "../shared/map/IncidentsMap";
import { isInsideMexico, useMexicoOutline, useMunicipalities, useStates } from "../shared/region/api";
import { useRegion } from "../shared/region/RegionContext";
import { Button, Field, Notice, PageHeader } from "../shared/ui";
import { GeoError, getBrowserPosition, parseCoordinate, reverseGeocode, searchAddress, type AddressResult } from "../shared/geo";
import { fieldA11y, PHOTO_MAX_COUNT, validateLength, validatePhotos } from "../shared/validation";

type Created = { id: string; public_id: string; incident_id: string | null; nearby_suggestions?: { public_id: string; distance_m: number }[] };
type Located = { state: { name: string }; municipality: { name: string } | null };

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];

type ActiveTicket = {
  email_verified: boolean;
  active: null | {
    public_id: string;
    title: string;
    status: string;
    incident_public_id: string | null;
    incident_status: string | null;
    urgency_score: number | null;
    stage: number;
    dispatched: boolean;
    crew_name: string | null;
    created_at: string;
  };
};

const STAGES = ["Emitido", "Validado por operador", "Atendido por cuadrilla"];

function TicketTracker({ stage, dispatched, crew }: { stage: number; dispatched: boolean; crew: string | null }) {
  return (
    <ol className="mt-5 grid gap-3 sm:grid-cols-3">
      {STAGES.map((label, i) => {
        const done = i + 1 < stage || (i + 1 === stage && i === 0);
        const current = i + 1 === stage && i > 0;
        return (
          <li key={label} className={`anim-fade rounded-card border p-3 ${done ? "border-ok/40 bg-ok/5" : current ? "border-cyan/40 bg-sky/40" : "border-line bg-card"}`} style={{ animationDelay: `${i * 80}ms` }}>
            <p className="text-[11px] uppercase tracking-[0.025em] text-warm">Etapa {i + 1}</p>
            <p className="mt-0.5 font-medium text-ink">
              {done ? "✓ " : current ? "● " : ""}
              {label}
            </p>
            {i === 1 && current && <p className="text-[12px] text-warm">{dispatched ? `Cuadrilla en camino${crew ? `: ${crew}` : ""}` : "Despacho revisó tu reporte"}</p>}
          </li>
        );
      })}
    </ol>
  );
}

function VerifyGate() {
  const { checkEmailVerified, resendVerification } = useAuth();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title={<>Verifica tu <span className="highlight">correo</span></>} lead="Para evitar reportes falsos, solo las cuentas verificadas pueden reportar y subir fotografías." />
      <Notice>Abre el enlace que te enviamos al registrarte (revisa también spam o promociones) y vuelve aquí.</Notice>
      {msg && <Notice tone="success">{msg}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() =>
            void checkEmailVerified().then((ok) => {
              if (ok) void qc.invalidateQueries({ queryKey: ["active-report"] });
              else setMsg("Todavía no aparece verificado. Abre el enlace del correo e inténtalo de nuevo.");
            })
          }
        >
          Ya lo verifiqué
        </Button>
        <Button onClick={() => void resendVerification().then(() => setMsg("Te enviamos un enlace nuevo."))}>Reenviar correo</Button>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const qc = useQueryClient();
  const { mode, emailVerified } = useAuth();
  const ticket = useQuery({
    queryKey: ["active-report"],
    queryFn: () => apiFetch<ActiveTicket>("/users/me/active-report"),
    refetchInterval: 30_000,
  });
  const { region } = useRegion();
  const states = useStates();
  const municipalities = useMunicipalities(region.cve_ent);
  const stateCenter = states.data?.find((s) => s.cve_ent === region.cve_ent)?.center ?? null;
  const munBox = municipalities.data?.find((m) => m.cvegeo === region.cvegeo)?.bbox;
  const munCenter: [number, number] | null = munBox ? [(munBox[1] + munBox[3]) / 2, (munBox[0] + munBox[2]) / 2] : null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("leak_public_road");
  const [severity, setSeverity] = useState("medium");
  const [flow, setFlow] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [point, setPoint] = useState<[number, number] | null>(null);
  const [address, setAddress] = useState("");
  // La dirección se autocompleta desde el punto mientras la persona no la edite a mano
  const [addressAuto, setAddressAuto] = useState(true);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [latText, setLatText] = useState("");
  const [lonText, setLonText] = useState("");
  const [coordErr, setCoordErr] = useState<string | null>(null);
  const [reverseBusy, setReverseBusy] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [photoWarn, setPhotoWarn] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const outline = useMexicoOutline();
  const previews = useMemo(() => photos.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), [photos]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const center = point ?? munCenter ?? stateCenter ?? DEFAULT_CENTER;
  const zoom = point ? 16 : munCenter ? 12 : stateCenter ? 8 : 11;
  const located = useQuery({
    queryKey: ["locate", point?.[0].toFixed(4), point?.[1].toFixed(4)],
    queryFn: () => apiFetch<Located>(`/regions/locate?lat=${point![0].toFixed(5)}&lon=${point![1].toFixed(5)}`),
    enabled: Boolean(point),
    retry: false,
  });

  const inside = point ? isInsideMexico(outline.data, point[0], point[1]) : null;
  const errors = {
    title: validateLength(title, 5, 120, "Título"),
    description: validateLength(description, 10, 2000, "Descripción"),
    address: address.trim().length > 200 ? "Referencia: máximo 200 caracteres." : undefined,
    photos: validatePhotos(photos),
    phone: phone && phone.replace(/\D/g, "").length !== 10 ? "El teléfono debe tener 10 dígitos (p. ej. 443 128 4902)." : undefined,
    point: !point
      ? "Marca en el mapa el lugar del problema o usa tu ubicación."
      : inside === false || located.isError
        ? "Ese punto está fuera de México. Agua Alerta solo recibe reportes en territorio nacional."
        : undefined,
  };
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : undefined);

  const addPhotos = (list: FileList | null) => {
    const next = [...photos, ...Array.from(list ?? [])];
    setPhotos(next.slice(0, PHOTO_MAX_COUNT));
    if (next.length > PHOTO_MAX_COUNT) setPhotoWarn(`Solo se conservaron las primeras ${PHOTO_MAX_COUNT} fotografías.`);
  };

  /** Cualquier origen (GPS, mapa, búsqueda, coordenadas) termina aquí. */
  const choosePoint = (lat: number, lon: number) => {
    setPoint([lat, lon]);
    setGeoMsg(null);
    setCoordErr(null);
    setLatText(lat.toFixed(6));
    setLonText(lon.toFixed(6));
  };

  // Al marcar o cambiar el punto, proponer la dirección (calle, colonia, C.P.) si la persona no la escribió.
  useEffect(() => {
    if (!point || !addressAuto) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setReverseBusy(true);
      try {
        const label = await reverseGeocode(point[0], point[1], ctrl.signal);
        if (label && !ctrl.signal.aborted) setAddress(label.slice(0, 200));
      } catch {
        // sin dirección sugerida: el punto sigue siendo válido
      } finally {
        if (!ctrl.signal.aborted) setReverseBusy(false);
      }
    }, 700);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [point, addressAuto]);

  const useGps = async () => {
    setGeoMsg(null);
    setGpsBusy(true);
    try {
      const pos = await getBrowserPosition();
      choosePoint(pos.lat, pos.lon);
      if (pos.accuracy > 200) setGeoMsg(`Ubicación aproximada (±${Math.round(pos.accuracy)} m). Ajusta el punto en el mapa si hace falta.`);
    } catch (err) {
      setGeoMsg(err instanceof GeoError ? err.message : "No se pudo obtener tu ubicación. Marca el punto en el mapa.");
    } finally {
      setGpsBusy(false);
    }
  };

  const runSearch = async () => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    setGeoMsg(null);
    try {
      setResults(await searchAddress(query));
    } catch (err) {
      setGeoMsg((err as Error).message);
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  const applyCoords = () => {
    const la = parseCoordinate(latText, "lat");
    const lo = parseCoordinate(lonText, "lon");
    if (la == null || lo == null) {
      setCoordErr("Coordenadas no válidas para México (latitud 14 a 33.5, longitud −118.5 a −86.5). Ejemplo: 19.43260, −99.13320");
      return;
    }
    choosePoint(la, lo);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) {
      setError("Revisa los campos marcados antes de enviar.");
      return;
    }
    if (!point) return;
    setBusy(true);
    setError("");
    setPhotoWarn("");
    try {
      const report = await apiFetch<Created>("/reports", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          category,
          severity,
          latitude: point[0],
          longitude: point[1],
          address_reference: address || null,
          leak_flow: flow,
          contact_phone: phone.replace(/\D/g, "") || null,
        }),
      });
      let failed = 0;
      for (const file of photos.slice(0, 5)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${getApiBase()}/reports/${report.id}/photos`, {
          method: "POST",
          headers: await authHeader(),
          body: fd,
        });
        if (!res.ok) failed += 1;
      }
      if (failed) setPhotoWarn(`${failed} foto(s) no se pudieron subir (formato o tamaño no válido).`);
      setCreated(report);
      void qc.invalidateQueries({ queryKey: ["active-report"] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verified = ticket.data ? ticket.data.email_verified : mode !== "firebase" || emailVerified;
  if (!created && ticket.data && !verified) return <VerifyGate />;
  const active = ticket.data?.active;
  if (!created && active) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          title={<>Tu reporte <span className="highlight">{active.public_id}</span> sigue activo</>}
          lead="Solo puedes tener un reporte activo a la vez. Podrás crear otro cuando la cuadrilla lo marque como atendido."
        />
        <section className="rounded-card border border-line bg-card p-5 shadow-card">
          <p className="font-medium text-ink">{active.title}</p>
          <p className="text-[13px] text-warm">
            Emitido el {new Date(active.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
            {active.urgency_score != null ? ` · Índice de urgencia ${active.urgency_score.toFixed(0)}/100` : ""}
          </p>
          <TicketTracker stage={active.stage} dispatched={active.dispatched} crew={active.crew_name} />
        </section>
        <div className="flex flex-wrap gap-2">
          <Link to="/mis-reportes" className="press inline-flex min-h-[44px] items-center rounded-full border border-cyan-edge bg-cyan px-4 font-medium text-white">
            Ver mis reportes
          </Link>
        </div>
        <section>
          <p className="text-[13px] text-warm">¿La fuga empeoró o hay riesgo para personas?</p>
          <CallButtons />
        </section>
      </div>
    );
  }

  if (created) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          title={
            <>
              Reporte <span className="highlight">{created.public_id}</span> registrado
            </>
          }
          lead="Guardamos tu reporte. Te avisaremos cuando se valide y cuando cambie de estado."
        />
        {photoWarn && <Notice tone="error">{photoWarn}</Notice>}
        {created.nearby_suggestions && created.nearby_suggestions.length > 0 && (
          <Notice>Había otros reportes cerca de ese punto; los agrupamos en la misma incidencia para priorizarla mejor.</Notice>
        )}
        <div className="flex flex-wrap gap-3">
          <Link to="/mis-reportes" className="rounded-full border border-cyan-edge bg-cyan px-4 py-2 font-medium text-white">
            Ver mis reportes
          </Link>
          <Button
            onClick={() => {
              setCreated(null);
              setTitle("");
              setDescription("");
              setPhotos([]);
              setPoint(null);
              setAddress("");
              setAddressAuto(true);
              setFlow(null);
            }}
          >
            Hacer otro reporte
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <PageHeader
        title={
          <>
            Reportar un <span className="highlight">problema de agua</span>
          </>
        }
        lead="Mientras más preciso sea el punto y la descripción, más rápido se puede validar y atender."
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-5">
          <Field label="¿Qué está pasando?">
            <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <fieldset>
            <legend className="label">Gravedad</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                <label
                  key={k}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-body ${
                    severity === k ? "border-soot bg-soot text-white" : "border-line bg-card text-ink hover:border-muted"
                  }`}
                >
                  <input type="radio" name="severity" value={k} className="sr-only" checked={severity === k} onChange={() => setSeverity(k)} />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">¿Cómo sale el agua? (opcional)</legend>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: "goteo", t: "Goteo", d: "Gotas constantes", icon: "💧" },
                { k: "chorro", t: "Chorro", d: "Flujo continuo", icon: "🚿" },
                { k: "inundacion", t: "Inundación", d: "Encharca la calle", icon: "🌊" },
              ].map((o) => (
                <label
                  key={o.k}
                  className={`press cursor-pointer rounded-card border p-3 text-center transition-colors ${
                    flow === o.k ? "border-cyan bg-sky/50 shadow-subtle" : "border-line bg-card hover:border-muted"
                  }`}
                >
                  <input type="radio" name="flow" value={o.k} className="sr-only" checked={flow === o.k} onChange={() => setFlow(o.k)} onClick={() => flow === o.k && setFlow(null)} />
                  <span className="block text-xl" aria-hidden>
                    {o.icon}
                  </span>
                  <span className="block text-[13px] font-medium text-ink">{o.t}</span>
                  <span className="block text-[11px] text-warm">
                    {o.d} · ~{FLOW_RATE_LPH[o.k].toLocaleString("es-MX")} L/h
                  </span>
                </label>
              ))}
            </div>
            <p className="hint">Nos ayuda a estimar cuánta agua se pierde mientras no se atiende.</p>
          </fieldset>
          <Field label="Título" hint="Ejemplo: Fuga constante frente al mercado" error={show("title")} htmlFor="rep-title" aside={`${title.trim().length}/120`}>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} {...fieldA11y("rep-title", show("title"))} />
          </Field>
          <Field label="Descripción" hint="Desde cuándo ocurre, cuánta agua sale, si afecta el paso." error={show("description")} htmlFor="rep-desc" aside={`${description.trim().length}/2000`}>
            <textarea className="field" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} {...fieldA11y("rep-desc", show("description"))} />
          </Field>
          <Field
            label="Dirección o referencia"
            hint={addressAuto && address ? "Sugerida a partir del punto en el mapa; puedes corregirla." : "Se completa sola al marcar el punto; también puedes escribirla."}
            error={show("address")}
            htmlFor="rep-addr"
          >
            <input
              className="field"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setAddressAuto(e.target.value.trim() === "");
              }}
              maxLength={200}
              placeholder={reverseBusy ? "Buscando la dirección del punto…" : "Calle, número, colonia, entre calles"}
              {...fieldA11y("rep-addr", show("address"))}
            />
          </Field>
          <Field
            label="Teléfono de contacto (opcional)"
            hint="Solo lo ven el operador y la cuadrilla asignada, por si necesitan llamarte para ubicar la fuga."
            error={show("phone")}
            htmlFor="rep-phone"
          >
            <input
              className="field"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={14}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))}
              placeholder="443 128 4902"
              {...fieldA11y("rep-phone", show("phone"))}
            />
          </Field>
          <Field
            label={`Fotografías (opcional, hasta ${PHOTO_MAX_COUNT})`}
            hint="JPEG, PNG o WebP de hasta 5 MB. Les quitamos los metadatos (incluida la ubicación) y se eliminan al cerrar el caso."
            error={errors.photos}
            htmlFor="rep-photos"
          >
            {previews.length > 0 && (
              <ul className="mb-2 grid grid-cols-5 gap-2">
                {previews.map((p, i) => (
                  <li key={p.url} className="group relative aspect-square overflow-hidden rounded-input border border-line bg-canvas">
                    <img src={p.url} alt={`Foto ${i + 1}: ${p.name}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 rounded-full bg-ink/70 px-1.5 text-[12px] leading-5 text-white"
                      aria-label={`Quitar ${p.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {photos.length < PHOTO_MAX_COUNT && (
              <input
                id="rep-photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="block w-full text-[13px] text-warm file:mr-3 file:rounded-full file:border file:border-line file:bg-card file:px-3 file:py-1.5 file:text-ink"
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            )}
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" variant="primary" disabled={busy} className="w-full sm:w-auto">
            {busy ? "Enviando…" : "Enviar reporte"}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="rounded-card border border-line bg-card p-4">
            <p className="label">Ubicación del problema</p>
            <p className="mb-3 text-[12px] text-warm">Usa tu ubicación, busca una dirección, escribe coordenadas o toca el mapa.</p>
            <div className="flex flex-wrap items-stretch gap-2">
              <Button variant="dark" onClick={() => void useGps()} disabled={gpsBusy}>
                {gpsBusy ? "Obteniendo ubicación…" : "Usar mi ubicación"}
              </Button>
              <div className="flex min-w-[240px] flex-1 gap-2">
                <input
                  className="field"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runSearch();
                    }
                  }}
                  placeholder="Buscar calle, colonia o lugar"
                  aria-label="Buscar dirección"
                />
                <Button onClick={() => void runSearch()} disabled={searching}>
                  {searching ? "Buscando…" : "Buscar"}
                </Button>
              </div>
            </div>
            {results && (
              <ul className="mt-2 max-h-48 divide-y divide-line overflow-auto rounded-input border border-line" aria-label="Resultados de la búsqueda">
                {results.length === 0 && <li className="px-3 py-2 text-[13px] text-warm">Sin resultados en México. Prueba con calle y municipio.</li>}
                {results.map((r) => (
                  <li key={`${r.lat},${r.lon}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-[13px] text-ink hover:bg-canvas"
                      onClick={() => {
                        choosePoint(r.lat, r.lon);
                        setResults(null);
                      }}
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="mt-3 text-[13px] text-cyan-edge hover:underline" onClick={() => setShowCoords((v) => !v)} aria-expanded={showCoords}>
              {showCoords ? "Ocultar coordenadas" : "Escribir coordenadas manualmente"}
            </button>
            {showCoords && (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="w-36">
                  <span className="label">Latitud</span>
                  <input className="field font-mono" inputMode="decimal" value={latText} onChange={(e) => setLatText(e.target.value)} placeholder="19.43260" />
                </label>
                <label className="w-36">
                  <span className="label">Longitud</span>
                  <input className="field font-mono" inputMode="decimal" value={lonText} onChange={(e) => setLonText(e.target.value)} placeholder="-99.13320" />
                </label>
                <Button onClick={applyCoords}>Ubicar</Button>
                {coordErr && <p className="w-full text-[12px] text-critical" role="alert">{coordErr}</p>}
              </div>
            )}
            {geoMsg && <p className="mt-3 text-[13px] text-warm" role="status">{geoMsg}</p>}
          </div>
          <p className="text-[13px] text-warm">
            {point ? (
              located.data ? (
                <>
                  Punto en <span className="text-ink">{located.data.municipality?.name ?? "municipio sin identificar"}</span>,{" "}
                  {located.data.state.name}
                </>
              ) : located.isError ? (
                <span className="text-critical">El punto está fuera de México.</span>
              ) : (
                "Identificando municipio…"
              )
            ) : (
              "Aún no hay punto: toca el mapa en el lugar exacto del problema."
            )}
          </p>
          <IncidentsMap center={center} zoom={zoom} pin={point} pickMode onPick={(la, lo) => choosePoint(la, lo)} className="h-[46vh] min-h-[240px] sm:h-[520px]" />
          {show("point") && <p className="text-[12px] text-critical" role="alert">{errors.point}</p>}
          {point && (
            <p className="font-mono text-[12px] text-ash">
              {point[0].toFixed(5)}, {point[1].toFixed(5)}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
