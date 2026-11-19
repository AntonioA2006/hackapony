import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../shared/auth/AuthContext";
import { apiFetch } from "../shared/api/client";
import { fmtFixed, fmtInt } from "../shared/labels";
import { BarList } from "../shared/charts";
import IncidentsMap from "../shared/map/IncidentsMap";
import { useStatesGeo } from "../shared/region/api";
import { ButtonLink, Card, CountUp, Stat } from "../shared/ui";
import { Link } from "react-router-dom";

type Zone = { municipality: string; state: string; count: number };
type Overview = {
  reports: number;
  pending: number;
  resolved: number;
  satisfaction_pct: number | null;
  avg_resolution_hours: number | null;
  ratings: number;
  zones: Zone[];
};

const FLOW = "M28 214c70-8 96-62 168-58 74 4 92 70 168 62 48-6 78-28 128-18";
const FLOW_STATES = [
  { label: "Recibido", color: "#526277", dot: "#94a3b8", priority: "Media" },
  { label: "Validado", color: "#0e5fbe", dot: "#1479e8", priority: "Alta" },
  { label: "En atención", color: "#0e5fbe", dot: "#14b8a6", priority: "Alta" },
  { label: "Resuelto", color: "#1e9e78", dot: "#1e9e78", priority: "Cerrada" },
];

function HeroMark() {
  const pathRef = useRef<SVGPathElement>(null);
  const [spot, setSpot] = useState({ x: 28, y: 214 });
  const [step, setStep] = useState(0);
  const stage = FLOW_STATES[step];

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const length = path.getTotalLength();
    const duration = 16000;
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const cycle = ((now - started) % (duration * 2)) / duration;
      const along = cycle <= 1 ? cycle : 2 - cycle;
      const eased = along * along * (3 - 2 * along);
      const point = path.getPointAtLength(eased * length);
      setSpot({ x: point.x, y: point.y });
      setStep(Math.min(FLOW_STATES.length - 1, Math.floor(eased * FLOW_STATES.length)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg viewBox="0 0 520 360" className="h-full w-full" role="img" aria-label="Una fuga recorre la red y cambia de estado">
      <rect width="520" height="360" fill="#f4f8fc" />
      <path d="M0 78h520M0 156h520M0 234h520M0 312h520M96 0v360M198 0v360M310 0v360M422 0v360" stroke="#d5e2ee" strokeWidth="1" />
      <path d={FLOW} fill="none" stroke="#1479e8" strokeWidth="8" strokeLinecap="round" />
      <path ref={pathRef} d={FLOW} fill="none" stroke="#7ec8f8" strokeWidth="3" strokeLinecap="round" />
      <g transform={`translate(${spot.x} ${spot.y})`} className="aa-flow-pin">
        <circle r="18" fill="#fff" stroke="#1479e8" strokeWidth="4" />
        <path d="M0 -12c6 8 10 14 10 20a10 10 0 1 1-20 0c0-6 4-12 10-20z" fill="#1479e8" />
      </g>
      <g transform="translate(286 46)" className="aa-hero-card">
        <rect width="196" height="92" rx="16" fill="#fff" stroke="#e2e8f0" />
        <circle cx="28" cy="32" r="10" fill={stage.dot} className="aa-status-dot" />
        <text x="48" y="28" fill="#526277" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif">Folio AA-2041</text>
        <text x="48" y="48" fill="#142235" fontSize="16" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">Fuga en la red</text>
        <text key={stage.label} x="48" y="70" fill={stage.color} fontSize="13" fontFamily="Plus Jakarta Sans, sans-serif" className="aa-status-label">
          {stage.label}
        </text>
      </g>
      <g transform="translate(36 250)" className="aa-hero-card">
        <rect width="150" height="64" rx="14" fill="#0b1f33" />
        <text x="16" y="28" fill="#8ea0b3" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif">Prioridad</text>
        <text key={stage.priority} x="16" y="48" fill="#fff" fontSize="16" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif" className="aa-status-label">
          {stage.priority}
        </text>
      </g>
    </svg>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Reporta en un minuto",
    body: "El reporte usa el lugar donde estás, describes la fuga y, si quieres, agregas fotos. Recibes un folio para darle seguimiento.",
  },
  {
    n: "02",
    title: "Se agrupa y se prioriza",
    body: "Los reportes cercanos se unen en una sola incidencia. Un índice explicable combina gravedad, corroboración, población de la zona y tiempo sin atención.",
  },
  {
    n: "03",
    title: "Seguimiento hasta el cierre",
    body: "Te avisamos cuando tu reporte se valida, entra en atención y se resuelve. Al cerrar el caso, las fotos se eliminan.",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const geo = useStatesGeo();
  const overview = useQuery({
    queryKey: ["public-stats"],
    queryFn: () => apiFetch<Overview>("/statistics/public"),
  });
  const stats = overview.data;

  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-4 text-[13px] font-medium tracking-wide text-cyan">Agua Alerta · México</p>
          <h1 className="max-w-3xl text-[36px] font-medium leading-[1.08] tracking-[-0.03em] text-ink sm:text-display">
            El agua es de todos. <span className="highlight">Cuidarla también.</span>
          </h1>
          <p className="mt-5 max-w-xl text-body-lg text-warm">
            Reporta fugas, identifica problemas y ayuda a construir comunidades con una mejor gestión del agua.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/mapa" variant="primary">
              Explorar mapa
            </ButtonLink>
            <ButtonLink to={user ? "/reportar" : "/registro"}>Reportar problema</ButtonLink>
          </div>
        </div>
        <div className="surface-elevated h-[240px] overflow-hidden sm:h-[320px]">
          <HeroMark />
        </div>
      </section>

      <div className="surface-elevated overflow-hidden bg-white p-2">
        <IncidentsMap regions={geo.data} className="h-[260px] sm:h-[420px]" />
      </div>

      <section id="indicadores" className="scroll-mt-24 space-y-4">
        <div>
          <h2 className="text-heading-sm">Indicadores</h2>
          <p className="mt-2 max-w-2xl text-body text-warm">
            Cifras del sistema. Si una casilla está en cero o en blanco, es porque todavía no hay ese dato: no se rellena.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Reportes registrados" value={stats ? <CountUp value={stats.reports} /> : "—"} note="Todos los reportes recibidos" />
          <Stat label="Incidencias pendientes" value={stats ? <CountUp value={stats.pending} /> : "—"} note="Abiertas, sin contar descartadas" />
          <Stat label="Incidencias atendidas" value={stats ? <CountUp value={stats.resolved} /> : "—"} note="Cerradas como resueltas" />
          <Stat
            label="Porcentaje de satisfacción"
            value={stats?.satisfaction_pct == null ? "—" : `${fmtFixed(stats.satisfaction_pct)} %`}
            note={stats?.ratings ? `${fmtInt(stats.ratings)} calificaciones` : "Aún no hay calificaciones"}
          />
          <Stat
            label="Tiempo de resolución"
            value={stats?.avg_resolution_hours == null ? "—" : `${fmtFixed(stats.avg_resolution_hours)} h`}
            note="Promedio de las ya resueltas"
          />
          <Stat label="Total de incidencias resueltas" value={stats ? fmtInt(stats.resolved) : "—"} note="El mismo conteo de atendidas" />
        </div>
        <Card>
          <h3 className="text-subheading">Zonas con mayor actividad</h3>
          <p className="mt-1 text-[13px] text-warm">Municipios con más incidencias ya validadas. El mapa público no muestra las que siguen en revisión.</p>
          <div className="mt-4">
            {stats && stats.zones.length > 0 ? (
              <BarList
                data={stats.zones.map((z) => ({
                  key: `${z.state}-${z.municipality}`,
                  label: `${z.municipality}, ${z.state}`,
                  value: z.count,
                }))}
                format={fmtInt}
                empty="Todavía no hay incidencias validadas por zona."
              />
            ) : (
              <p className="rounded-card border border-dashed border-muted px-4 py-8 text-center text-body text-warm">
                Todavía no hay incidencias validadas por zona.
              </p>
            )}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="max-w-2xl text-heading-sm">
          De un reporte aislado a <span className="highlight">información para actuar</span>
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <Card key={s.n}>
              <p className="font-mono text-[12px] text-cyan-edge">{s.n}</p>
              <h3 className="mt-3 text-subheading">{s.title}</h3>
              <p className="mt-2 text-body text-warm">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="surface-elevated p-8">
        <h2 className="text-subheading">Sobre nosotros</h2>
        <p className="mt-3 max-w-3xl text-body text-warm">
          Agua Alerta da folio, prioridad y seguimiento a cada fuga, desde el reporte hasta el cierre confirmado.
        </p>
        <Link to="/nosotros" className="mt-4 inline-flex text-body font-medium text-cyan-edge hover:underline">
          Sobre nosotros y aviso legal
        </Link>
      </section>

      <section className="surface-elevated p-8">
        <h2 className="text-subheading">Lo que mostramos y lo que no</h2>
        <ul className="mt-4 grid gap-3 text-body text-warm md:grid-cols-2">
          <li>Los indicadores de agua son estadística oficial del Censo 2020; los reportes son información ciudadana.</li>
          <li>La población de la zona es una referencia para priorizar, no el número de personas afectadas.</li>
          <li>En el mapa público no aparecen nombres, correos ni fotografías de quien reporta.</li>
          <li>Tu ubicación solo se usa para ubicar tu estado y municipio; no guardamos tus coordenadas.</li>
        </ul>
      </section>
    </div>
  );
}
