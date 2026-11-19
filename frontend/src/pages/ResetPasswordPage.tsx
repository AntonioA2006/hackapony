import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../shared/api/client";

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

  if (done) {
    return <p className="text-green-800">Contraseña actualizada. Redirigiendo al login…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 rounded border bg-white p-6 shadow">
      <h1 className="text-xl font-semibold">Nueva contraseña</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        className="w-full rounded border p-2 font-mono text-sm"
        placeholder="Token de recuperación"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        required
      />
      <input
        className="w-full rounded border p-2"
        type="password"
        placeholder="Nueva contraseña (mín. 8 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      <button type="submit" className="w-full rounded bg-primary-600 py-2 text-white">
        Guardar
      </button>
      <p className="text-sm">
        <Link to="/login">Volver al login</Link>
      </p>
    </form>
  );
}