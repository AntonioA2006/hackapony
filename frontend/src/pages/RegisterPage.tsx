import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password, displayName);
      navigate("/tablero");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 rounded border bg-white p-6 shadow">
      <h1 className="text-xl font-semibold">Registro ciudadano</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input className="w-full rounded border p-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nombre" required />
      <input className="w-full rounded border p-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
      <input className="w-full rounded border p-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 8)" required minLength={8} />
      <button type="submit" className="w-full rounded bg-primary-600 py-2 text-white">
        Crear cuenta
      </button>
    </form>
  );
}