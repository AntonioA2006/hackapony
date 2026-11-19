import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-700">Agua Alerta</h1>
      <p className="max-w-2xl text-slate-700">
        Plataforma ciudadana para reportar fugas y problemas de agua potable, con mapa público y priorización para gestión
        municipal.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link to="/mapa" className="rounded bg-primary-600 px-4 py-2 text-white">
          Ver mapa
        </Link>
        <Link to="/reportar" className="rounded border border-primary-600 px-4 py-2 text-primary-700">
          Reportar problema
        </Link>
      </div>
    </section>
  );
}