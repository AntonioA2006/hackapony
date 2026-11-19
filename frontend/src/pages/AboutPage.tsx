import { Link } from "react-router-dom";

const PRINCIPLES = [
  {
    title: "Ciudadanía primero",
    body: "Cualquier persona con cuenta puede reportar una fuga donde está, seguir su folio y saber cuándo quedó resuelta.",
  },
  {
    title: "Operación con evidencia",
    body: "Un operador valida. Una cuadrilla atiende, explica la reparación y adjunta una foto. Otro operador confirma el cierre.",
  },
  {
    title: "Datos con límite",
    body: "El mapa público no muestra el punto exacto ni la foto de la reparación. Al confirmar el cierre, esas imágenes se borran.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-16">
      <section className="max-w-3xl pt-2">
        <p className="text-[13px] font-medium tracking-wide text-cyan">Morelia · Michoacán</p>
        <h1 className="mt-3 text-[36px] font-medium leading-[1.08] tracking-[-0.03em] text-ink sm:text-display">
          Somos una startup <span className="highlight">michoacana</span>
        </h1>
        <p className="mt-5 text-body-lg text-warm">
          Agua Alerta nació en Michoacán para que una fuga deje de ser un rumor de colonia y se convierta en un caso con
          folio, prioridad y seguimiento. Construimos software para ciudadanos, operadores y cuadrillas del agua.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PRINCIPLES.map((item) => (
          <article key={item.title} className="rounded-card border border-line bg-card p-6">
            <h2 className="text-subheading">{item.title}</h2>
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

      <section id="aviso-legal" className="scroll-mt-24 space-y-8 rounded-feature border border-line bg-card p-8">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-warm">Aviso legal</p>
          <h2 className="mt-2 text-heading-sm">Términos y aviso de privacidad</h2>
          <p className="mt-3 max-w-3xl text-body text-warm">
            Texto de Agua Alerta para el uso de esta plataforma. No es asesoría jurídica ni un registro ante autoridad.
            El teléfono del botón de contacto, +52 55 0000 0000, es ficticio y de demostración: no abre llamadas ni WhatsApp.
          </p>
        </div>

        <div className="space-y-3 text-body text-warm">
          <h3 className="text-subheading text-ink">1. Quiénes somos</h3>
          <p>
            Agua Alerta es una startup con origen en Michoacán, México. Operamos esta plataforma para recibir y dar
            seguimiento a reportes ciudadanos de fugas y problemas de agua potable.
          </p>
          <h3 className="text-subheading text-ink">2. Qué datos pedimos</h3>
          <p>
            Cuenta (nombre, correo y verificación), el contenido del reporte, una referencia de lugar y, si la persona lo
            escribe, un teléfono de contacto de diez dígitos. La ubicación del dispositivo solo se usa para comprobar que
            el reporte se hace a menos de 250 metros de donde está quien reporta. En el mapa público la coordenada se
            muestra aproximada, cerca de 30 metros, y sin nombre, correo ni fotografías.
          </p>
          <h3 className="text-subheading text-ink">3. Fotografías</h3>
          <p>
            Las fotos del reporte las ven quien reportó y el personal que atiende el caso. La foto de la reparación la
            sube la cuadrilla y solo la ve el personal. Un usuario común no puede abrirla. Cuando el operador confirma el
            cierre, esas imágenes se borran del almacenamiento. Se conserva el hecho del reporte, no el archivo.
          </p>
          <h3 className="text-subheading text-ink">4. Para qué los usamos</h3>
          <p>
            Para crear el folio, agrupar reportes cercanos, priorizar, avisar cambios de estado y mostrar estadísticas
            agregadas. No vendemos datos personales ni los usamos para publicidad de terceros.
          </p>
          <h3 className="text-subheading text-ink">5. Uso aceptable</h3>
          <p>
            Una cuenta ciudadana mantiene un reporte activo a la vez. No se aceptan reportes fuera de México, ni puntos
            alejados de la persona, ni contenido falso a sabiendas. El personal puede rechazar un reporte con un motivo.
          </p>
          <h3 className="text-subheading text-ink">6. Cuentas y sesión</h3>
          <p>
            El acceso en producción usa Firebase Authentication. La persona puede verificar su correo, recuperar el acceso
            y cerrar sesión. Quien no verifica el correo no puede enviar reportes ni fotos.
          </p>
          <h3 className="text-subheading text-ink">7. Ley aplicable</h3>
          <p>
            Este aviso se interpreta conforme a las leyes de México. Para cualquier controversia sobre el uso de la
            plataforma, las partes se someten a los tribunales competentes de Morelia, Michoacán, salvo los derechos que
            la ley no permita renunciar.
          </p>
          <p className="text-[13px] text-ash">Vigente desde el 19 de noviembre de 2026.</p>
        </div>
      </section>

      <p className="text-body text-warm">
        <Link to="/mapa" className="text-cyan-edge hover:underline">
          Explorar el mapa
        </Link>
        <span className="mx-2 text-ash">·</span>
        <Link to="/" className="text-cyan-edge hover:underline">
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}
