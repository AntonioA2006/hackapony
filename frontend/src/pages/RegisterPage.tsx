import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthContext";
import { authErrorMessage } from "../shared/firebase";
import { Button, Field, Notice } from "../shared/ui";
import AuthLayout from "./AuthLayout";

export default function RegisterPage() {
  const { register, mode } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(email, password, displayName.trim());
      navigate("/tablero");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={<>Crea tu cuenta <span className="highlight">ciudadana</span></>}
      lead="Con una cuenta puedes reportar, confirmar incidencias y recibir avisos de seguimiento."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link className="text-cyan-edge hover:underline" to="/login">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Nombre para mostrar" hint="No se publica en el mapa.">
          <input className="field" autoComplete="nickname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={120} />
        </Field>
        <Field label="Correo electrónico" hint={mode === "firebase" ? "Te enviaremos un enlace para verificarlo." : undefined}>
          <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres.">
          <input className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </Field>
        <label className="flex items-start gap-2 text-[13px] text-warm">
          <input type="checkbox" className="mt-1 accent-[#3ba6f1]" checked={terms} onChange={(e) => setTerms(e.target.checked)} required />
          Confirmo que soy mayor de edad y acepto que mis reportes se usen para atender problemas de agua. Mi nombre y correo no se publican.
        </label>
        <Button type="submit" variant="primary" disabled={busy || !terms} className="w-full">
          {busy ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
    </AuthLayout>
  );
}
