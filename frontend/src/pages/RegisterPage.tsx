import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthContext";
import { authErrorMessage } from "../shared/firebase";
import { Button, Field, Notice } from "../shared/ui";
import {
  fieldA11y,
  passwordStrength,
  validateEmail,
  validateName,
  validatePassword,
  type Errors,
} from "../shared/validation";
import AuthLayout from "./AuthLayout";

type K = "name" | "email" | "password" | "confirm" | "terms";
const BAR = ["bg-critical", "bg-critical", "bg-high", "bg-medium", "bg-ok"];

export default function RegisterPage() {
  const { register, mode } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const errors: Errors<K> = {
    name: validateName(displayName),
    email: validateEmail(email),
    password: validatePassword(password),
    confirm: confirm !== password ? "Las contraseñas no coinciden." : !confirm ? "Repite tu contraseña." : undefined,
    terms: terms ? undefined : "Necesitas aceptar para continuar.",
  };
  const show = (k: K) => (touched[k] ? errors[k] : undefined);
  const strength = passwordStrength(password);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true, terms: true });
    if (Object.values(errors).some(Boolean)) return;
    setError("");
    setBusy(true);
    try {
      await register(email.trim(), password, displayName.trim());
      navigate("/tablero");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const blur = (k: K) => () => setTouched((t) => ({ ...t, [k]: true }));

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
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Nombre para mostrar" hint="No se publica en el mapa." error={show("name")} htmlFor="reg-name">
          <input className="field" autoComplete="nickname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} onBlur={blur("name")} maxLength={60} {...fieldA11y("reg-name", show("name"))} />
        </Field>
        <Field
          label="Correo electrónico"
          hint={mode === "firebase" ? "Te enviaremos un enlace para verificarlo (revisa también spam)." : undefined}
          error={show("email")}
          htmlFor="reg-email"
        >
          <input className="field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={blur("email")} {...fieldA11y("reg-email", show("email"))} />
        </Field>
        <Field label="Contraseña" error={show("password")} htmlFor="reg-pass" aside={password ? strength.label : undefined}>
          <input className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} onBlur={blur("password")} {...fieldA11y("reg-pass", show("password"))} />
          <div className="mt-2 grid grid-cols-4 gap-1" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1 rounded-full ${strength.score >= i ? BAR[strength.score] : "bg-line"}`} />
            ))}
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12px]">
            {strength.checks.map((c) => (
              <li key={c.text} className={c.ok ? "text-ok" : "text-ash"}>
                {c.ok ? "✓" : "·"} {c.text}
              </li>
            ))}
          </ul>
        </Field>
        <Field label="Confirmar contraseña" error={show("confirm")} htmlFor="reg-confirm">
          <input className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onBlur={blur("confirm")} {...fieldA11y("reg-confirm", show("confirm"))} />
        </Field>
        <div>
          <label className="flex items-start gap-2 text-[13px] text-warm">
            <input type="checkbox" className="mt-1 accent-[#0b84c6]" checked={terms} onChange={(e) => setTerms(e.target.checked)} onBlur={blur("terms")} />
            Confirmo que soy mayor de edad y acepto que mis reportes se usen para atender problemas de agua. Mi nombre y correo
            no se publican.
          </label>
          {show("terms") && <p className="mt-1 text-[12px] text-critical">{errors.terms}</p>}
        </div>
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {busy ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
    </AuthLayout>
  );
}
