import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../shared/api/client";

type Notification = { id: string; title: string; body: string; read_at: string | null; created_at: string };

export default function DashboardPage() {
  const qc = useQueryClient();
  const notifications = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => apiFetch<{ items: Notification[] }>("/users/me/notifications?unread_only=true&page_size=10"),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/users/me/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications"] }),
  });
  const { data } = useQuery({
    queryKey: ["citizen-dashboard"],
    queryFn: () =>
      apiFetch<{ total_reports: number; pending: number; in_progress: number; resolved: number }>(
        "/statistics/citizen-dashboard",
      ),
  });
  const cards = [
    ["Total", data?.total_reports ?? 0],
    ["Pendientes", data?.pending ?? 0],
    ["En atención", data?.in_progress ?? 0],
    ["Resueltos", data?.resolved ?? 0],
  ] as const;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tablero ciudadano</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, val]) => (
          <div key={label} className="rounded border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="text-3xl font-bold text-primary-700">{val}</p>
          </div>
        ))}
      </div>
      <Link to="/reportar" className="inline-block rounded bg-primary-600 px-4 py-2 text-white">
        Nuevo reporte
      </Link>
      <section>
        <h2 className="mb-2 text-lg font-medium">Notificaciones</h2>
        <ul className="divide-y rounded border bg-white">
          {(notifications.data?.items ?? []).map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-slate-600">{n.body}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded border px-2 py-1"
                onClick={() => markRead.mutate(n.id)}
              >
                Marcar leída
              </button>
            </li>
          ))}
          {!notifications.data?.items?.length && (
            <li className="p-3 text-slate-500">No hay notificaciones sin leer.</li>
          )}
        </ul>
      </section>
    </div>
  );
}