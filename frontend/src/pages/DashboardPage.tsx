import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../shared/api/client";
import { useAuth } from "../shared/auth/AuthContext";
import { useRegion } from "../shared/region/RegionContext";
import { Button, ButtonLink, Notice, PageHeader, Stat } from "../shared/ui";

type Notification = { id: string; title: string; body: string; read_at: string | null; created_at: string };

export default function DashboardPage() {
  const { user, mode, emailVerified, checkEmailVerified, resendVerification } = useAuth();
  const [params, setParams] = useSearchParams();
  const [verifyMsg, setVerifyMsg] = useState<{ tone: "success" | "info" | "error"; text: string } | null>(null);

  // Regreso desde el enlace del correo (?verificado=1): confirmar con Firebase y avisar.
  useEffect(() => {
    if (params.get("verificado") !== "1") return;
    void checkEmailVerified().then((ok) => {
      setVerifyMsg(
        ok
          ? { tone: "success", text: "¡Listo! Tu correo quedó verificado." }
          : { tone: "info", text: "Aún no vemos la verificación. Abre el enlace del correo y vuelve a esta página." },
      );
      params.delete("verificado");
      setParams(params, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { region } = useRegion();
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
      apiFetch<{ total_reports: number; pending: number; in_progress: number; resolved: number }>("/statistics/citizen-dashboard"),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={<>Hola, <span className="highlight">{user?.display_name?.split(" ")[0] ?? "ciudadana/o"}</span></>}
        lead={region.state_name ? `Tu región: ${[region.municipality_name, region.state_name].filter(Boolean).join(", ")}.` : "Elige tu región en el mapa para ver lo que pasa cerca de ti."}
        actions={
          <>
            <ButtonLink to="/mapa">Ver mapa</ButtonLink>
            <ButtonLink to="/reportar" variant="primary">Nuevo reporte</ButtonLink>
          </>
        }
      />
      {verifyMsg && <Notice tone={verifyMsg.tone}>{verifyMsg.text}</Notice>}
      {mode === "firebase" && !emailVerified && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-card px-4 py-3">
          <p className="mr-auto text-body text-warm">
            Verifica tu correo desde el enlace que te enviamos (revisa también spam) para que tus reportes cuenten al priorizar.
          </p>
          <Button
            onClick={() =>
              void checkEmailVerified().then((ok) =>
                setVerifyMsg(
                  ok
                    ? { tone: "success", text: "¡Listo! Tu correo quedó verificado." }
                    : { tone: "info", text: "Todavía no aparece verificado. Abre el enlace del correo e inténtalo de nuevo." },
                ),
              )
            }
          >
            Ya lo verifiqué
          </Button>
          <Button
            variant="quiet"
            onClick={() =>
              void resendVerification()
                .then(() => setVerifyMsg({ tone: "info", text: "Te enviamos un nuevo enlace de verificación." }))
                .catch((e) => setVerifyMsg({ tone: "error", text: (e as Error).message }))
            }
          >
            Reenviar correo
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reportes enviados" value={data?.total_reports ?? 0} />
        <Stat label="Pendientes" value={data?.pending ?? 0} />
        <Stat label="En atención" value={data?.in_progress ?? 0} />
        <Stat label="Resueltos" value={data?.resolved ?? 0} />
      </div>
      <section>
        <h2 className="mb-3 text-subheading">Avisos</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
          {(notifications.data?.items ?? []).map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium text-ink">{n.title}</p>
                <p className="text-warm">{n.body}</p>
              </div>
              <button type="button" className="shrink-0 rounded-full border border-line px-3 py-1 text-[13px] hover:border-muted" onClick={() => markRead.mutate(n.id)}>
                Marcar como leído
              </button>
            </li>
          ))}
          {!notifications.data?.items?.length && <li className="px-5 py-6 text-center text-warm">No tienes avisos pendientes.</li>}
        </ul>
      </section>
    </div>
  );
}
