import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../shared/api/client";

type Report = {
  public_id: string;
  title: string;
  status: string;
  created_at: string;
  incident_id: string | null;
};

type Paginated<T> = { items: T[] };

export default function MyReportsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => apiFetch<Paginated<Report>>("/users/me/reports"),
  });
  if (isLoading) return <p>Cargando…</p>;
  if (error) return <p className="text-red-600">{(error as Error).message}</p>;
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Mis reportes</h1>
      <ul className="divide-y rounded border bg-white">
        {(data?.items ?? []).map((r) => (
          <li key={r.public_id} className="p-4">
            <p className="font-mono text-primary-700">{r.public_id}</p>
            <p>{r.title}</p>
            <p className="text-sm text-slate-600">Estado: {r.status}</p>
            {r.incident_id && <p className="text-sm">Incidencia vinculada</p>}
          </li>
        ))}
        {!data?.items?.length && <li className="p-4 text-slate-500">Sin reportes aún.</li>}
      </ul>
    </div>
  );
}