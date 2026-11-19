import { useMemo } from "react";
import { useAuth } from "../shared/auth/AuthContext";
import { fmtInt, fmtPct } from "../shared/labels";
import IncidentsMap from "../shared/map/IncidentsMap";
import { useStates, useStatesGeo } from "../shared/region/api";
import { ButtonLink, Card, Stat } from "../shared/ui";

const STEPS = [
  {
    n: "01",
    title: "Reporta en un minuto",
    body: "Marca el punto en el mapa, describe la fuga y, si quieres, agrega fotos. Recibes un folio para darle seguimiento.",
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
  const states = useStates();
  const geo = useStatesGeo();

  const stats = useMemo(() => {
    const items = states.data ?? [];
    const viv = items.reduce((a, s) => a + (s.water?.viviendas ?? 0), 0);
    const sin = items.reduce((a, s) => a + (s.water?.sin_agua_entubada ?? 0), 0);
    const open = items.reduce((a, s) => a + s.open_incidents, 0);
    return { viv, sin, pct: viv ? (100 * sin) / viv : null, open };
  }, [states.data]);

  return (
    <div className="space-y-24">
      <section className="pt-6">
        <p className="mb-4 text-[13px] font-medium text-warm">Plataforma ciudadana · Cobertura nacional</p>
        <h1 className="max-w-3xl text-[40px] leading-[1.12] tracking-[-0.021em] sm:text-display">
          Cada fuga reportada es agua que <span className="highlight">no se pierde</span>
        </h1>
        <p className="mt-5 max-w-2xl text-body-lg text-warm">
          Reporta fugas y problemas de agua potable en tu colonia. Agua Alerta agrupa los reportes, los prioriza con un
          criterio público y los muestra sobre los datos oficiales de INEGI sobre el acceso al agua en tu estado y municipio.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to={user ? "/reportar" : "/registro"} variant="primary">
            {user ? "Reportar una fuga" : "Crear cuenta y reportar"}
          </ButtonLink>
          <ButtonLink to="/mapa">Ver el mapa</ButtonLink>
        </div>

        <div className="mt-14 rounded-feature bg-card p-2 shadow-float">
          <IncidentsMap regions={geo.data} className="h-[420px]" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Viviendas sin agua entubada"
          value={fmtInt(stats.sin || null)}
          note="México, Censo 2020 (INEGI)"
        />
        <Stat label="Proporción del total" value={fmtPct(stats.pct)} note={`de ${fmtInt(stats.viv || null)} viviendas habitadas`} />
        <Stat label="Incidencias activas" value={fmtInt(stats.open)} note="reportadas y en seguimiento" />
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
