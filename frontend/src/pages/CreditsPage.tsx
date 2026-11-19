import { Link } from "react-router-dom";

const TEAM = ["Antonio", "Jan Carlo", "Roberto", "Dan"];

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function CreditsPage() {
  return (
    <div className="space-y-12">
      <section className="max-w-3xl pt-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-sky px-3 py-1 text-[13px] font-medium text-cyan-edge">
          <i className="fa-solid fa-trophy" aria-hidden /> Hackapony 2026
        </p>
        <h1 className="mt-4 text-[36px] font-medium leading-[1.08] tracking-[-0.03em] text-ink sm:text-display">
          <span className="highlight">Créditos</span>
        </h1>
        <p className="mt-5 text-body-lg text-warm">
          Agua Alerta fue un proyecto creado para el Hackapony 2026. Estas son las personas que lo hicieron posible.
        </p>
      </section>

      <section aria-label="Equipo" className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEAM.map((name) => (
          <article
            key={name}
            className="group rounded-card border border-line bg-card p-6 text-center transition duration-200 hover:-translate-y-1 hover:border-cyan/40 hover:shadow-lg"
          >
            <div
              className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-cyan to-cyan-edge text-[24px] font-semibold text-white transition-transform duration-200 group-hover:scale-105"
              aria-hidden
            >
              {initials(name)}
            </div>
            <h2 className="mt-4 text-subheading">{name}</h2>
            <p className="mt-1 text-[13px] text-warm">Equipo Agua Alerta</p>
          </article>
        ))}
      </section>

      <section className="rounded-feature border border-line bg-card p-8">
        <h2 className="text-subheading">Sobre el proyecto</h2>
        <p className="mt-3 max-w-3xl text-body text-warm">
          Nació en el Hackapony 2026 con una idea simple: que cada fuga de agua reportada tenga folio, alguien que la valide y
          una cuadrilla que la cierre con evidencia. Incluye el sitio web, la API y la app móvil para Android.
        </p>
      </section>

      <p className="text-body text-warm">
        <Link to="/nosotros" className="text-cyan-edge hover:underline">
          Sobre nosotros
        </Link>
        <span className="mx-2 text-ash">·</span>
        <Link to="/mapa" className="text-cyan-edge hover:underline">
          Explorar el mapa
        </Link>
      </p>
    </div>
  );
}
