import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, clearTokens, getRefreshToken, getToken, setTokens, type Tokens } from "../api/client";

type User = { id: string; email: string; display_name: string; role: string };

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, display_name: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    apiFetch<User>("/users/me")
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ user: User; tokens: Tokens }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.tokens);
    setUser(data.user);
  };

  const register = async (email: string, password: string, display_name: string) => {
    const data = await apiFetch<{ user: User; tokens: Tokens }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name, accept_terms: true }),
    });
    setTokens(data.tokens);
    setUser(data.user);
  };

  const logout = async () => {
    const refresh_token = getRefreshToken();
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token }),
      });
    } catch {
      // cerrar sesión local aunque falle la red
    }
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}