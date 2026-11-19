import { Link } from "react-router-dom";

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section>
        <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-warm">Aviso legal</p>
        <h1 className="mt-2 text-heading-sm">Términos y aviso de privacidad</h1>
        <p className="mt-3 text-body text-warm">
          Texto de Agua Alerta para el uso de esta plataforma. No es asesoría jurídica ni un registro ante autoridad. El
          teléfono del botón de contacto, +52 55 0000 0000, es ficticio y de demostración: no abre llamadas ni WhatsApp.
        </p>
      </section>
      <section className="space-y-3 text-body text-warm">
        <h2 className="text-subheading text-ink">1. Quiénes somos</h2>
        <p>Agua Alerta opera esta plataforma para recibir y dar seguimiento a reportes ciudadanos de fugas y problemas de agua potable.</p>
        <h2 className="text-subheading text-ink">2. Qué datos pedimos</h2>
        <p>
          Cuenta (nombre, correo y verificación), el contenido del reporte, una referencia de lugar y, si la persona lo
          escribe, un teléfono de contacto de diez dígitos. La ubicación del dispositivo solo se usa para comprobar que el
          reporte se hace a menos de 250 metros de donde está quien reporta. En el mapa público la coordenada se muestra
          aproximada, cerca de 30 metros, y sin nombre, correo ni fotografías.
        </p>
        <h2 className="text-subheading text-ink">3. Fotografías</h2>
        <p>
          Las fotos del reporte las ven quien reportó y el personal que atiende el caso. La foto de la reparación la sube
          la cuadrilla y solo la ve el personal. Un usuario común no puede abrirla. Cuando el operador confirma el cierre,
          esas imágenes se borran del almacenamiento. Se conserva el hecho del reporte, no el archivo.
        </p>
        <h2 className="text-subheading text-ink">4. Para qué los usamos</h2>
        <p>
          Para crear el folio, agrupar reportes cercanos, priorizar, avisar cambios de estado y mostrar estadísticas
          agregadas. No vendemos datos personales ni los usamos para publicidad de terceros.
        </p>
        <h2 className="text-subheading text-ink">5. Uso aceptable</h2>
        <p>
          Una cuenta ciudadana mantiene un reporte activo a la vez. No se aceptan reportes fuera de México, ni puntos
          alejados de la persona, ni contenido falso a sabiendas. El personal puede rechazar un reporte con un motivo.
        </p>
        <h2 className="text-subheading text-ink">6. Cuentas y sesión</h2>
        <p>
          El acceso en producción usa Firebase Authentication. La persona puede verificar su correo, recuperar el acceso y
          cerrar sesión. Quien no verifica el correo no puede enviar reportes ni fotos.
        </p>
        <h2 className="text-subheading text-ink">7. Ley aplicable</h2>
        <p>
          Este aviso se interpreta conforme a las leyes de México. Para cualquier controversia sobre el uso de la
          plataforma, las partes se someten a los tribunales competentes de Morelia, Michoacán, salvo los derechos que la
          ley no permita renunciar.
        </p>
        <p className="text-[13px] text-ash">Vigente desde el 19 de noviembre de 2026.</p>
      </section>
      <p className="text-body text-warm">
        <Link to="/nosotros" className="text-cyan-edge hover:underline">
          Sobre nosotros
        </Link>
      </p>
    </div>
  );
}
