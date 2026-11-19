import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../shared/api/client";
import { useAuth } from "../shared/auth/AuthContext";
import IncidentsMap from "../shared/map/IncidentsMap";
import QueryError from "../shared/ui/QueryError";

type Paginated<T> = { items: T[] };

export default function MapPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["public-incidents"],
    queryFn: () => apiFetch<Paginated<Parameters<typeof IncidentsMap>[0]["incidents"][0]>>("/incidents/public?page_size=100"),
    retry: 1,
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/incidents/${id}/confirm`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-incidents"] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mapa de incidencias</h1>
      {isLoading && <p className="text-slate-600">Cargando incidencias…</p>}
      {error && <QueryError error={error} context="map" onRetry={() => void refetch()} />}
      {!error && (
        <IncidentsMap incidents={data?.items ?? []} />
      )}
      {isFetching && !isLoading && <p className="text-xs text-slate-500">Actualizando…</p>}
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