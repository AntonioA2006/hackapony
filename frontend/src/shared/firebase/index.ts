import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Configuración web de Firebase: es pública por diseño (identifica el proyecto; no concede acceso).
 * Si no está definida, la app usa la autenticación propia de la API (desarrollo local / red del equipo).
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function firebaseAuth(): Auth {
  if (!firebaseEnabled) throw new Error("Firebase no está configurado");
  if (!auth) {
    app = initializeApp(config);
    auth = getAuth(app);
    auth.languageCode = "es";
  }
  return auth;
}

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/invalid-email": "El correo no es válido.",
  "auth/user-disabled": "Esta cuenta está deshabilitada.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
  "auth/weak-password": "La contraseña debe tener al menos 8 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
  "auth/requires-recent-login": "Por seguridad, vuelve a iniciar sesión e inténtalo de nuevo.",
  "auth/network-request-failed": "Sin conexión. Revisa tu red e inténtalo de nuevo.",
  "auth/missing-password": "Escribe tu contraseña.",
};

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && FIREBASE_ERRORS[code]) return FIREBASE_ERRORS[code];
  return err instanceof Error ? err.message : "No fue posible completar la operación.";
}
