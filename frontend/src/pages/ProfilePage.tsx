import { useState, type FormEvent } from "react";
import { useAuth } from "../shared/auth/AuthContext";
import { authErrorMessage } from "../shared/firebase";
import { useRegion } from "../shared/region/RegionContext";
import { RegionSelect } from "../shared/region/RegionPicker";
import { Button, Card, Field, Notice, PageHeader, Tag } from "../shared/ui";

export default function ProfilePage() {
  const { user, mode, emailVerified, updateDisplayName, changePassword, resendVerification } = useAuth();
  const { region } = useRegion();
  const [name, setName] = useState(user?.display_name ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "success", text: ok });
    } catch (err) {
      setMsg({ tone: "error", text: authErrorMessage(err) });
    }
  };

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    void run(() => updateDisplayName(name.trim()), "Nombre actualizado.");
  };

  const savePassword = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
    }, "Contraseña actualizada.");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={<>Mi <span className="highlight">perfil</span></>} lead="Tus datos de cuenta y tu región de referencia." />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-body text-ink">{user?.email}</p>
          {mode === "firebase" && (emailVerified ? <Tag tone="accent">Correo verificado</Tag> : <Tag>Correo sin verificar</Tag>)}
          {mode === "firebase" && !emailVerified && (
            <Button variant="quiet" onClick={() => void run(resendVerification, "Te enviamos un nuevo enlace de verificación.")}>
              Reenviar verificación
            </Button>
          )}
        </div>
        <form onSubmit={saveName} className="mt-5 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Field label="Nombre para mostrar">
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required />
            </Field>
          </div>
          <Button type="submit" variant="dark">
            Guardar nombre
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-subheading">Mi región</h2>
        <p className="mt-1 text-body text-warm">
          {region.state_name
            ? `Actualmente: ${[region.municipality_name, region.state_name].filter(Boolean).join(", ")}.`
            : "Viendo todo México."}{" "}
          Se guarda en este navegador.
        </p>
        <div className="mt-4">
          <RegionSelect compact />
        </div>
      </Card>

      {mode === "firebase" && (
        <Card>
          <h2 className="text-subheading">Cambiar contraseña</h2>
          <form onSubmit={savePassword} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Contraseña actual">
              <input className="field" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </Field>
            <Field label="Nueva contraseña" hint="Mínimo 8 caracteres.">
              <input className="field" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required />
            </Field>
            <div>
              <Button type="submit" variant="dark">
                Actualizar contraseña
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
