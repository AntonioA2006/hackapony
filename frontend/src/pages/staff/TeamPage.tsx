import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { apiFetch } from "../../shared/api/client";
import { ROLE_LABELS } from "../../shared/roles";
import { useTechnicians, type StaffUser } from "../../shared/staff/api";
import QueryError from "../../shared/ui/QueryError";
import { Button, Card, Notice, PageHeader, Tag } from "../../shared/ui";

export default function TeamPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const techs = useTechnicians();
  const search = useQuery({
    queryKey: ["users-search", term],
    queryFn: () => apiFetch<{ items: StaffUser[] }>(`/users?q=${encodeURIComponent(term)}&page_size=10`),
    enabled: term.length >= 2,
  });
  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiFetch<StaffUser>(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: (u) => {
      setMsg({ tone: "success", text: `${u.display_name} ahora es ${ROLE_LABELS[u.role].toLowerCase()}.` });
      void qc.invalidateQueries({ queryKey: ["technicians"] });
      void qc.invalidateQueries({ queryKey: ["users-search"] });
    },
    onError: (e) => setMsg({ tone: "error", text: (e as Error).message }),
  });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setTerm(q.trim());
  };

  const [cveEnt, setCveEnt] = useState("09");
  const [cveMun, setCveMun] = useState("002");
  const importAgeb = useMutation({ mutationFn: () => apiFetch(`/inegi/import/wscatgeo/${cveEnt}/${cveMun}/ageb`, { method: "POST" }) });

  return (
    <div className="space-y-8">
      <PageHeader title={<>Equipo <span className="highlight">técnico</span></>} lead="Nombra técnicos con el ID que cada persona ve en su perfil, y revisa la carga de trabajo." />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <Card>
        <h2 className="text-subheading">Nombrar técnico</h2>
        <p className="mt-1 text-body text-warm">
          Pide a la persona que cree su cuenta y te comparta su <strong className="font-medium text-ink">ID</strong> (Perfil → “Mi ID”). También puedes buscar por correo o nombre.
        </p>
        <form onSubmit={onSearch} className="mt-4 flex flex-wrap gap-2">
          <input className="field min-w-[260px] flex-1 font-mono" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID (UUID), correo o nombre" aria-label="Buscar persona" />
          <Button type="submit" variant="dark">
            Buscar
          </Button>
        </form>
        {search.error && <QueryError error={search.error} />}
        {search.data && (
          <ul className="mt-4 divide-y divide-line rounded-input border border-line">
            {search.data.items.map((u) => (
              <li key={u.id} className="anim-fade flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-[220px] flex-1">
                  <p className="text-ink">{u.display_name}</p>
                  <p className="font-mono text-[11px] text-warm">
                    {u.email} · {u.id}
                  </p>
                </div>
                <Tag tone={u.role === "CIUDADANO" ? "neutral" : "accent"}>{ROLE_LABELS[u.role]}</Tag>
                {u.role === "CIUDADANO" && (
                  <Button variant="primary" onClick={() => setRole.mutate({ id: u.id, role: "TECNICO" })}>
                    Nombrar técnico
                  </Button>
                )}
                {(u.role === "TECNICO" || u.role === "ADMINISTRADOR") && (
                  <Button onClick={() => window.confirm(`¿Quitar el rol de técnico a ${u.display_name}? Sus casos abiertos volverán a la cola.`) && setRole.mutate({ id: u.id, role: "CIUDADANO" })}>
                    Quitar rol
                  </Button>
                )}
              </li>
            ))}
            {!search.data.items.length && <li className="px-4 py-3 text-[13px] text-warm">Sin coincidencias.</li>}
          </ul>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-subheading">Personal activo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {techs.data?.map((t) => (
            <div key={t.id} className="lift rounded-card border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-ink">{t.display_name}</p>
                <Tag tone={t.role === "SUPERADMINISTRADOR" ? "dark" : "accent"}>{ROLE_LABELS[t.role]}</Tag>
              </div>
              <p className="mt-1 truncate text-[12px] text-warm">{t.email}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                <div className="rounded-input bg-canvas p-2">
                  <dt className="text-[11px] text-warm">Abiertos</dt>
                  <dd className="tabular-nums text-ink">{t.open_assigned}</dd>
                </div>
                <div className="rounded-input bg-canvas p-2">
                  <dt className="text-[11px] text-warm">Resueltos</dt>
                  <dd className="tabular-nums text-ink">{t.resolved_total}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <Card>
        <h2 className="text-subheading">Datos INEGI (zonas censales)</h2>
        <p className="mt-1 text-body text-warm">Estados, municipios e indicadores de agua se cargan solos al desplegar. Importa AGEB de un municipio para afinar el índice de urgencia.</p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label>
            <span className="label">Entidad</span>
            <input className="field w-20" value={cveEnt} onChange={(e) => setCveEnt(e.target.value)} />
          </label>
          <label>
            <span className="label">Municipio</span>
            <input className="field w-24" value={cveMun} onChange={(e) => setCveMun(e.target.value)} />
          </label>
          <Button variant="dark" disabled={importAgeb.isPending} onClick={() => importAgeb.mutate()}>
            {importAgeb.isPending ? "Importando…" : "Importar AGEB"}
          </Button>
        </div>
        {importAgeb.isSuccess && <pre className="mt-3 overflow-x-auto rounded-input bg-canvas p-3 text-[12px]">{JSON.stringify(importAgeb.data, null, 2)}</pre>}
        {importAgeb.error && <QueryError error={importAgeb.error} />}
      </Card>
    </div>
  );
}
