import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthContext";
import { authErrorMessage, firebaseAuth } from "../shared/firebase";
import { Button, ButtonLink, Field, Notice, Spinner } from "../shared/ui";
import { fieldA11y, passwordStrength, validatePassword } from "../shared/validation";
import AuthLayout from "./AuthLayout";

type Mode = "verifyEmail" | "resetPassword" | "recoverEmail" | "verifyAndChangeEmail";

/**
 * Lee los parámetros del enlace de Firebase tolerando enlaces alterados por clientes de correo
 * (p. ej. "&amp;mode=" convertido en la clave "amp;mode", o el enlace envuelto en otra URL).
 */
export function parseActionParams(href: string): { mode: string | null; oobCode: string | null } {
  const decoded = decodeURIComponent(href.replace(/&amp;/g, "&"));
  const find = (key: string) => {
    const m = decoded.match(new RegExp(`[?&](?:amp;)?${key}=([^&#]+)`));
    return m ? m[1] : null;
  };
  return { mode: find("mode"), oobCode: find("oobCode") };
}

const CODE_ERRORS: Record<string, string> = {
  "auth/expired-action-code": "El enlace caducó. Pide uno nuevo.",
  "auth/invalid-action-code": "El enlace no es válido o ya se usó. Si ya verificaste tu correo, puedes iniciar sesión.",
  "auth/user-disabled": "Esta cuenta está deshabilitada.",
  "auth/user-not-found": "La cuenta ya no existe.",
};

function codeError(err: unknown) {
  const code = (err as { code?: string })?.code;
  return (code && CODE_ERRORS[code]) || authErrorMessage(err);
}

export default function AuthActionPage() {
  const { mode, oobCode } = useMemo(() => parseActionParams(window.location.href), []);
  const { user, checkEmailVerified, resendVerification } = useAuth();
  const [state, setState] = useState<"working" | "done" | "error" | "form">("working");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!oobCode || !mode) {
      setState("error");
      setMessage("El enlace está incompleto. Ábrelo de nuevo desde el correo o pide uno nuevo.");
      return;
    }
    const auth = firebaseAuth();
    (async () => {
      try {
        switch (mode as Mode) {
          case "verifyEmail":
          case "verifyAndChangeEmail":
            await applyActionCode(auth, oobCode);
            await checkEmailVerified().catch(() => undefined);
            setMessage("Tu correo quedó verificado. Ya puedes reportar y tus reportes cuentan para priorizar.");
            setState("done");
            break;
          case "resetPassword":
            setEmail(await verifyPasswordResetCode(auth, oobCode));
            setState("form");
            break;
          case "recoverEmail": {
            const info = await checkActionCode(auth, oobCode);
            await applyActionCode(auth, oobCode);
            setMessage(`Restauramos el correo de tu cuenta a ${info.data.email ?? "tu correo anterior"}. Te recomendamos cambiar tu contraseña.`);
            setState("done");
            break;
          }
          default:
            setState("error");
            setMessage("Este enlace no corresponde a una acción conocida.");
        }
      } catch (err) {
        setState("error");
        setMessage(codeError(err));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passErr = validatePassword(password);
  const confirmErr = confirm && confirm !== password ? "Las contraseñas no coinciden." : undefined;

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    if (passErr || confirmErr || !confirm || !oobCode) return;
    setBusy(true);
    try {
      await confirmPasswordReset(firebaseAuth(), oobCode, password);
      setMessage("Tu contraseña se actualizó. Ya puedes iniciar sesión con la nueva.");
      setState("done");
    } catch (err) {
      setState("error");
      setMessage(codeError(err));
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "resetPassword" ? (
      <>Nueva <span className="highlight">contraseña</span></>
    ) : (
      <>Verificación de <span className="highlight">correo</span></>
    );

  return (
    <AuthLayout title={title}>
      {state === "working" && <Spinner label="Procesando el enlace…" />}
      {state === "done" && (
        <div className="space-y-4">
          <Notice tone="success">{message}</Notice>
          <ButtonLink to={user ? "/tablero" : "/login"} variant="primary" className="w-full">
            {user ? "Ir a mi tablero" : "Iniciar sesión"}
          </ButtonLink>
        </div>
      )}
      {state === "error" && (
        <div className="space-y-4">
          <Notice tone="error">{message}</Notice>
          <div className="flex flex-wrap gap-2">
            {user && mode !== "resetPassword" && (
              <Button variant="primary" onClick={() => void resendVerification().then(() => setMessage("Te enviamos un enlace nuevo. Ábrelo desde este navegador."))}>
                Enviar un enlace nuevo
              </Button>
            )}
            {mode === "resetPassword" && <ButtonLink to="/recuperar" variant="primary">Pedir otro enlace</ButtonLink>}
            <ButtonLink to={user ? "/tablero" : "/login"}>{user ? "Ir a mi tablero" : "Iniciar sesión"}</ButtonLink>
          </div>
        </div>
      )}
      {state === "form" && (
        <form onSubmit={onReset} className="space-y-4" noValidate>
          <p className="text-body text-warm">
            Cuenta: <span className="text-ink">{email}</span>
          </p>
          <Field label="Nueva contraseña" error={password ? passErr : undefined} htmlFor="act-pass" aside={password ? passwordStrength(password).label : undefined}>
            <input className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} {...fieldA11y("act-pass", password ? passErr : undefined)} />
          </Field>
          <Field label="Confirmar contraseña" error={confirmErr} htmlFor="act-confirm">
            <input className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} {...fieldA11y("act-confirm", confirmErr)} />
          </Field>
          <Button type="submit" variant="primary" disabled={busy || Boolean(passErr) || !confirm || Boolean(confirmErr)} className="w-full">
            {busy ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-[12px] text-ash">
        ¿Problemas con el enlace? <Link className="underline" to="/login">Inicia sesión</Link> y pide uno nuevo desde tu tablero.
      </p>
    </AuthLayout>
  );
}
