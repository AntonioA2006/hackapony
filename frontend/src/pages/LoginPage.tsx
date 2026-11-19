import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/tablero");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 rounded border bg-white p-6 shadow">
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input className="w-full rounded border p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full rounded border p-2" type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit" className="w-full rounded bg-primary-600 py-2 text-white">
        Entrar
      </button>
      <p className="text-sm">
        <Link to="/recuperar">Olvidé mi contraseña</Link>
      </p>
      <p className="text-sm">
        ¿Sin cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </form>
  );
}