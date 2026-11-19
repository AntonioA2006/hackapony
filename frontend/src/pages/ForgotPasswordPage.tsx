import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../shared/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevToken(null);
    try {
      const res = await apiFetch<{ message: string; dev_reset_token?: string | null }>("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(res.message);
      if (res.dev_reset_token) setDevToken(res.dev_reset_token);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 rounded border bg-white p-6 shadow">
      <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
      <p className="text-sm text-slate-600">Ingresa tu correo. La respuesta no indica si existe la cuenta.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-800">{message}</p>}
      <input
        className="w-full rounded border p-2"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" className="w-full rounded bg-primary-600 py-2 text-white">
        Enviar solicitud
      </button>
      {devToken && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-medium">Modo desarrollo</p>
          <p className="break-all font-mono text-xs">{devToken}</p>
          <Link className="text-primary-600 underline" to={`/restablecer?token=${encodeURIComponent(devToken)}`}>
            Abrir formulario de nueva contraseña
          </Link>
        </div>
      )}
      <p className="text-sm">
        <Link to="/login">Volver al login</Link>
      </p>
    </form>
  );
}