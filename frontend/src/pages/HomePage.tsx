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

function HeroMark() {
  return (
    <svg viewBox="0 0 360 280" className="h-full w-full" role="img" aria-label="Esquema de mapa, tubería y reportes">
      <rect width="360" height="280" rx="20" fill="#0b1f33" />
      <g stroke="#1c3b58" strokeWidth="1">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`v${i}`} x1={40 + i * 40} y1="24" x2={40 + i * 40} y2="256" />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`h${i}`} x1="24" y1={36 + i * 40} x2="336" y2={36 + i * 40} />
        ))}
      </g>
      <path d="M48 168c40-8 52-48 92-48s48 36 88 28 48-40 84-24" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 196c36 10 60-20 96-12s52 28 84 12 40-28 84-8" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <g>
        <circle cx="140" cy="120" r="16" fill="#1479e8" />
        <circle cx="228" cy="148" r="11" fill="#38bdf8" />
        <circle cx="188" cy="196" r="8" fill="#14b8a6" />
      </g>
      <g transform="translate(248 48)">
        <rect width="84" height="52" rx="10" fill="#142235" stroke="#1c3b58" />
        <text x="12" y="22" fill="#8ea0b3" fontSize="9" fontFamily="Inter, sans-serif">Reporte</text>
        <text x="12" y="38" fill="#f7fafc" fontSize="12" fontFamily="Inter, sans-serif">Validado</text>
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
        <div className="h-[220px] overflow-hidden rounded-feature shadow-float sm:h-[280px]">
          <HeroMark />
        </div>
      </section>

      <div className="overflow-hidden rounded-feature border border-line bg-card p-2 shadow-card">
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

      <section className="rounded-feature border border-line bg-card p-8">
        <h2 className="text-subheading">Una startup michoacana</h2>
        <p className="mt-3 max-w-3xl text-body text-warm">
          Agua Alerta se construye desde Michoacán para que una fuga tenga folio, prioridad y seguimiento hasta el cierre.
        </p>
        <Link to="/nosotros" className="mt-4 inline-flex text-body font-medium text-cyan-edge hover:underline">
          Sobre nosotros y aviso legal
        </Link>
      </section>

      <section className="rounded-feature border border-line bg-card p-8">
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
