import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../shared/api/client";
import { Button, Field, Notice } from "../shared/ui";
import AuthLayout from "./AuthLayout";

/** Restablecimiento con la API propia (modo local). Con Firebase, el enlace del correo abre la página de Firebase. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <AuthLayout title={<>Nueva <span className="highlight">contraseña</span></>} footer={<Link className="hover:text-ink" to="/login">Volver a iniciar sesión</Link>}>
      {done ? (
        <Notice tone="success">Contraseña actualizada. Te llevamos al inicio de sesión…</Notice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}
          <Field label="Código de recuperación">
            <input className="field font-mono" value={token} onChange={(e) => setToken(e.target.value)} required />
          </Field>
          <Field label="Nueva contraseña" hint="Mínimo 8 caracteres.">
            <input className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </Field>
          <Button type="submit" variant="primary" className="w-full">
            Guardar
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
