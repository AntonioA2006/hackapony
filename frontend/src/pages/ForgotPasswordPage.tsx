import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthContext";
import { authErrorMessage } from "../shared/firebase";
import { Button, Field, Notice } from "../shared/ui";
import AuthLayout from "./AuthLayout";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevToken(null);
    setBusy(true);
    try {
      const res = await requestPasswordReset(email);
      setMessage(res.message);
      if (res.dev_reset_token) setDevToken(res.dev_reset_token);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={<>Recupera tu <span className="highlight">acceso</span></>}
      lead="Escribe tu correo y te enviaremos un enlace para elegir una nueva contraseña."
      footer={<Link className="hover:text-ink" to="/login">Volver a iniciar sesión</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        {message && <Notice tone="success">{message}</Notice>}
        <Field label="Correo electrónico">
          <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {busy ? "Enviando…" : "Enviar enlace"}
        </Button>
        {devToken && (
          <div className="rounded-card border border-dashed border-muted p-3 text-[13px]">
            <p className="font-medium">Modo desarrollo</p>
            <Link className="text-cyan-edge underline" to={`/restablecer?token=${encodeURIComponent(devToken)}`}>
              Abrir formulario de nueva contraseña
            </Link>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
