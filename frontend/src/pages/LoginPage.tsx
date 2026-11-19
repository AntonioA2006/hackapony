import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type User } from "../shared/auth/AuthContext";
import { authErrorMessage } from "../shared/firebase";
import { isCrew, isOperator, isSupervisor } from "../shared/roles";
import { useView, VIEW_HOME, viewFor } from "../shared/viewMode";
import { Button, Field, Notice } from "../shared/ui";
import { fieldA11y, validateEmail } from "../shared/validation";
import AuthLayout from "./AuthLayout";

type Entry = "ciudadano" | "operador" | "cuadrilla";

const ENTRY_TEXT: Record<Entry, { title: string; lead: string }> = {
  ciudadano: { title: "Bienvenida de", lead: "Inicia sesión para reportar y dar seguimiento a tu caso." },
  operador: { title: "Acceso de", lead: "Despacho: valida incidencias y envíalas a las cuadrillas." },
  cuadrilla: { title: "Acceso de", lead: "Personal de campo: consulta y cierra tus órdenes de atención." },
};

export default function LoginPage() {
  const { login, logout, waking } = useAuth();
  const { choose } = useView();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry>("ciudadano");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr || !password) {
      setError(emailErr ?? "Escribe tu contraseña.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const me: User = await login(email.trim(), password);
      // Las entradas de personal exigen ese rol. Supervisión puede entrar por cualquiera y usar esa vista.
      const sup = isSupervisor(me.role);
      if (entry === "operador" && !isOperator(me.role)) {
        await logout();
        setError("Tu cuenta no tiene el rol de operador. Pide a supervisión que te lo asigne.");
        return;
      }
      if (entry === "cuadrilla" && !isCrew(me.role) && !sup) {
        await logout();
        setError("Tu cuenta no pertenece a una cuadrilla. Pide a supervisión que te asigne ese rol.");
        return;
      }
      if (sup) choose(entry);
      navigate(VIEW_HOME[viewFor(me.role, sup ? entry : null)]);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const t = ENTRY_TEXT[entry];
  const word = entry === "ciudadano" ? "vuelta" : entry === "operador" ? "operador" : "cuadrilla";

  return (
    <AuthLayout
      title={
        <>
          {t.title} <span className="highlight">{word}</span>
        </>
      }
      lead={t.lead}
      footer={
        entry === "ciudadano" ? (
          <>
            ¿Aún no tienes cuenta?{" "}
            <Link className="text-cyan-edge hover:underline" to="/registro">
              Crear cuenta
            </Link>
          </>
        ) : (
          <button type="button" className="text-cyan-edge hover:underline" onClick={() => { setEntry("ciudadano"); setError(""); }}>
            ← Volver al acceso ciudadano
          </button>
        )
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        {busy && waking && <Notice>El servidor estaba en reposo y está despertando; puede tardar hasta un minuto.</Notice>}
        <Field label={entry === "ciudadano" ? "Correo electrónico" : "Usuario (correo institucional)"} htmlFor="login-email">
          <input className="field" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required {...fieldA11y("login-email")} />
        </Field>
        <Field label="Contraseña" htmlFor="login-pass">
          <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required {...fieldA11y("login-pass")} />
        </Field>
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {busy ? (waking ? "Despertando el servidor…" : "Entrando…") : entry === "ciudadano" ? "Entrar" : `Entrar como ${word}`}
        </Button>
        <div className="flex justify-end">
          <Link to="/recuperar" className="text-[13px] text-warm hover:text-ink">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </form>
      {entry === "ciudadano" && (
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-3 text-center text-[12px] text-warm">¿Eres personal del organismo operador?</p>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <Button onClick={() => { setEntry("operador"); setError(""); }}>Entrar como operador</Button>
            <Button onClick={() => { setEntry("cuadrilla"); setError(""); }}>Entrar como cuadrilla</Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
