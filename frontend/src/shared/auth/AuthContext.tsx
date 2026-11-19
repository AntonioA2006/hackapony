import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  apiFetch,
  clearTokens,
  getRefreshToken,
  getToken,
  setTokenProvider,
  setTokens,
  withWakeRetry,
  type Tokens,
} from "../api/client";
import { firebaseAuth, firebaseEnabled } from "../firebase";

export type User = { id: string; email: string; display_name: string; role: string };

type AuthState = {
  user: User | null;
  loading: boolean;
  /** "firebase" en producción; "local" usa la autenticación propia de la API (desarrollo). */
  mode: "firebase" | "local";
  emailVerified: boolean;
  /** Hay sesión de Firebase pero la API no respondió (p. ej. servidor despertando). */
  sessionError: string | null;
  /** La API está tardando: se muestra "despertando el servidor". */
  waking: boolean;
  retrySession: () => Promise<void>;
  checkEmailVerified: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, display_name: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ message: string; dev_reset_token?: string | null }>;
  updateDisplayName: (name: string) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** El enlace del correo regresa al sitio (botón "Continuar" en la página de Firebase). */
const verificationSettings = () => ({ url: `${window.location.origin}/tablero?verificado=1` });

if (firebaseEnabled) {
  setTokenProvider(async () => (await firebaseAuth().currentUser?.getIdToken()) ?? null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [waking, setWaking] = useState(false);
  const mode = firebaseEnabled ? "firebase" : "local";

  const refreshUser = useCallback(async () => {
    setWaking(false);
    try {
      const me = await withWakeRetry(() => apiFetch<User>("/users/me"), () => setWaking(true));
      setUser(me);
      setSessionError(null);
    } finally {
      setWaking(false);
    }
  }, []);

  /** Tras abrir el enlace del correo, Firebase marca la cuenta; aquí recargamos el estado y el token. */
  const checkEmailVerified = useCallback(async () => {
    const fbUser = firebaseEnabled ? firebaseAuth().currentUser : null;
    if (!fbUser) return false;
    await fbUser.reload();
    if (fbUser.emailVerified) await fbUser.getIdToken(true);
    setEmailVerified(fbUser.emailVerified);
    return fbUser.emailVerified;
  }, []);

  useEffect(() => {
    if (firebaseEnabled) {
      return onAuthStateChanged(firebaseAuth(), async (fbUser) => {
        setEmailVerified(Boolean(fbUser?.emailVerified));
        if (!fbUser) {
          setUser(null);
          setLoading(false);
          return;
        }
        try {
          await refreshUser(); // la API crea la cuenta ciudadana en el primer acceso
        } catch (err) {
          // No cerrar la sesión de Firebase por un fallo del servidor: se ofrece reintentar.
          setUser(null);
          setSessionError((err as Error)?.message || "No pudimos cargar tu cuenta.");
        } finally {
          setLoading(false);
        }
      });
    }
    if (!getToken()) {
      setLoading(false);
      return;
    }
    refreshUser()
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
    return undefined;
  }, [refreshUser]);

  // Al volver a la pestaña (p. ej. después de abrir el enlace del correo) se actualiza la verificación.
  useEffect(() => {
    if (!firebaseEnabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && firebaseAuth().currentUser && !firebaseAuth().currentUser!.emailVerified) {
        void checkEmailVerified().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [checkEmailVerified]);

  const login = async (email: string, password: string) => {
    if (firebaseEnabled) {
      await signInWithEmailAndPassword(firebaseAuth(), email, password);
      await refreshUser();
      return;
    }
    const data = await apiFetch<{ user: User; tokens: Tokens }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.tokens);
    setUser(data.user);
  };

  const register = async (email: string, password: string, display_name: string) => {
    if (firebaseEnabled) {
      const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
      await updateProfile(cred.user, { displayName: display_name });
      await sendEmailVerification(cred.user, verificationSettings()).catch(() => undefined);
      await cred.user.getIdToken(true); // incluye el nombre en el token para el alta en la API
      await apiFetch<User>("/users/me", { method: "PATCH", body: JSON.stringify({ display_name }) }).then(setUser);
      return;
    }
    const data = await apiFetch<{ user: User; tokens: Tokens }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name, accept_terms: true }),
    });
    setTokens(data.tokens);
    setUser(data.user);
  };

  const retrySession = async () => {
    setSessionError(null);
    setLoading(true);
    try {
      await refreshUser();
    } catch (err) {
      setSessionError((err as Error)?.message || "No pudimos cargar tu cuenta.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setSessionError(null);
    if (firebaseEnabled) {
      await signOut(firebaseAuth());
    } else {
      const refresh_token = getRefreshToken();
      try {
        await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token }) });
      } catch {
        // cerrar sesión local aunque falle la red
      }
      clearTokens();
    }
    setUser(null);
  };

  const requestPasswordReset = async (email: string) => {
    if (firebaseEnabled) {
      await sendPasswordResetEmail(firebaseAuth(), email).catch((err) => {
        // No revelar si la cuenta existe
        if ((err as { code?: string })?.code !== "auth/user-not-found") throw err;
      });
      return { message: "Si la cuenta existe, te enviamos un correo con el enlace para restablecer tu contraseña." };
    }
    return apiFetch<{ message: string; dev_reset_token?: string | null }>("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  const updateDisplayName = async (name: string) => {
    if (firebaseEnabled && firebaseAuth().currentUser) {
      await updateProfile(firebaseAuth().currentUser!, { displayName: name });
    }
    setUser(await apiFetch<User>("/users/me", { method: "PATCH", body: JSON.stringify({ display_name: name }) }));
  };

  const changePassword = async (current: string, next: string) => {
    const fbUser = firebaseEnabled ? firebaseAuth().currentUser : null;
    if (!fbUser?.email) throw new Error("Cambiar la contraseña requiere una cuenta de Firebase.");
    await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email, current));
    await updatePassword(fbUser, next);
  };

  const resendVerification = async () => {
    const fbUser = firebaseEnabled ? firebaseAuth().currentUser : null;
    if (fbUser) await sendEmailVerification(fbUser, verificationSettings());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        mode,
        emailVerified,
        sessionError,
        waking,
        retrySession,
        checkEmailVerified,
        login,
        register,
        logout,
        requestPasswordReset,
        updateDisplayName,
        changePassword,
        resendVerification,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
