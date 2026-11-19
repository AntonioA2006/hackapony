import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthContext";
import { authErrorMessage } from "../shared/firebase";
import { Button, Field, Notice } from "../shared/ui";
import { fieldA11y, validateEmail } from "../shared/validation";
import AuthLayout from "./AuthLayout";

export default function LoginPage() {
  const { login, waking } = useAuth();
  const navigate = useNavigate();
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
      await login(email, password);
      navigate("/tablero");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={<>Bienvenida de <span className="highlight">vuelta</span></>}
      lead="Inicia sesión para reportar y dar seguimiento a tus casos."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link className="text-cyan-edge hover:underline" to="/registro">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        {busy && waking && (
          <Notice>El servidor estaba en reposo y está despertando; esto puede tardar hasta un minuto. No cierres la página.</Notice>
        )}
        <Field label="Correo electrónico" htmlFor="login-email">
          <input className="field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required {...fieldA11y("login-email")} />
        </Field>
        <Field label="Contraseña" htmlFor="login-pass">
          <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required {...fieldA11y("login-pass")} />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <Link to="/recuperar" className="text-[13px] text-warm hover:text-ink">
            ¿Olvidaste tu contraseña?
          </Link>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? (waking ? "Despertando el servidor…" : "Entrando…") : "Entrar"}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
