import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../shared/api/client";
import IncidentsMap from "../shared/map/IncidentsMap";
import { useAuth } from "../shared/auth/AuthContext";

type Paginated<T> = { items: T[] };

export default function MapPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-incidents"],
    queryFn: () => apiFetch<Paginated<Parameters<typeof IncidentsMap>[0]["incidents"][0]>>("/incidents/public?page_size=100"),
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/incidents/${id}/confirm`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-incidents"] }),
  });

  if (isLoading) return <p>Cargando mapa…</p>;
  if (error) return <p className="text-red-600">{(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mapa de incidencias</h1>
      <IncidentsMap incidents={data?.items ?? []} />
      {user && (
        <ul className="space-y-2 text-sm">
          {(data?.items ?? []).slice(0, 10).map((inc) => (
            <li key={inc.id} className="flex items-center gap-3 rounded border bg-white p-2">
              <span className="font-mono">{inc.public_id}</span>
              <button
                type="button"
                className="rounded bg-accent-500 px-2 py-1 text-white"
                onClick={() => confirmMut.mutate(inc.id)}
                disabled={confirmMut.isPending}
              >
                Confirmar avistamiento
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}