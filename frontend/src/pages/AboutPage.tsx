import { Link } from "react-router-dom";

const PILLARS = [
  {
    kicker: "Misión",
    title: "Que el agua reportada tenga dueño",
    body: "Convertir cada fuga en un caso con folio, alguien que lo valida y una cuadrilla que lo cierra. Nadie debería depender de un grupo de chat para que se repare una tubería.",
  },
  {
    kicker: "Visión",
    title: "Una red que se ve y se atiende",
    body: "Imaginar ciudades donde el mapa del agua deja de ser un rumor y pasa a ser una cola de trabajo: clara para quien reporta, útil para quien opera y verificable cuando el caso termina.",
  },
  {
    kicker: "Valores",
    title: "Evidencia, cuidado y claridad",
    body: "Pedimos la foto y la explicación porque el cierre se demuestra. Cuidamos el dato: la ubicación pública es aproximada y las fotos se borran al confirmar. Hablamos en español llano, sin esconder el estado del caso.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-16">
      <section className="max-w-3xl pt-2">
        <p className="text-[13px] font-medium tracking-wide text-cyan">Agua Alerta</p>
        <h1 className="mt-3 text-[36px] font-medium leading-[1.08] tracking-[-0.03em] text-ink sm:text-display">
          Sobre <span className="highlight">nosotros</span>
        </h1>
        <p className="mt-5 text-body-lg text-warm">
          Conectamos a quien reporta una fuga con quien la valida y con la cuadrilla que la repara. Cada caso tiene folio,
          prioridad y un cierre que se confirma.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((item) => (
          <article key={item.kicker} className="rounded-card border border-line bg-card p-6">
            <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-cyan">{item.kicker}</p>
            <h2 className="mt-2 text-subheading">{item.title}</h2>
            <p className="mt-2 text-body text-warm">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-feature border border-line bg-card p-8">
        <h2 className="text-subheading">Qué hacemos</h2>
        <p className="mt-3 max-w-3xl text-body text-warm">
          Recibimos reportes de fugas y problemas de agua potable en México. Los agrupamos, los priorizamos con un
          criterio público y los ponemos sobre el contexto de viviendas de INEGI. La atención la cierra una cuadrilla y
          la confirma un operador. No sustituimos al organismo operador del agua: les damos una cola de trabajo más clara.
        </p>
      </section>

      <p className="text-body text-warm">
        <Link to="/aviso-legal" className="text-cyan-edge hover:underline">
          Aviso legal
        </Link>
        <span className="mx-2 text-ash">·</span>
        <Link to="/mapa" className="text-cyan-edge hover:underline">
          Explorar el mapa
        </Link>
      </p>
    </div>
  );
}
