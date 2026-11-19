const DEFAULT_LOCAL = "http://localhost:8000/api/v1";

/** Resuelve la base de la API según el host del navegador (evita localhost en dispositivos LAN). */
export function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (typeof window === "undefined") {
    return env || DEFAULT_LOCAL;
  }

  const { hostname, port, protocol, host } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (env?.startsWith("/")) {
    return env;
  }

  if (env && !env.includes("localhost") && !env.includes("127.0.0.1")) {
    return env.replace(/\/$/, "");
  }

  const gatewayPorts = new Set(["", "80", "3080", "8081"]);
  if (gatewayPorts.has(port)) {
    return `${protocol}//${host}/api/v1`;
  }

  if (port === "5173") {
    if (isLocalHost) {
      return (env || DEFAULT_LOCAL).replace(/\/$/, "");
    }
    return `${protocol}//${hostname}:8000/api/v1`;
  }

  if (env?.includes("localhost") || env?.includes("127.0.0.1")) {
    if (!isLocalHost) {
      return `${protocol}//${host}/api/v1`;
    }
  }

  return (env || DEFAULT_LOCAL).replace(/\/$/, "");
}

export class ApiConnectionError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ApiConnectionError";
    this.cause = cause;
  }
}

export type Tokens = {
  access_token: string;
  refresh_token: string;
};

export function getToken(): string | null {
  return localStorage.getItem("access_token");
}

export function setTokens(tokens: Tokens) {
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refresh_token = getRefreshToken();
    if (!refresh_token) return false;
    try {
      const res = await fetch(`${getApiBase()}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) return false;
      const tokens = (await res.json()) as Tokens;
      setTokens(tokens);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

const CONNECT_HELP =
  "No se pudo conectar con el servidor. Verifica que Agua Alerta esté ejecutándose y que estés conectado a la misma red.";

const FETCH_TIMEOUT_MS = 30_000;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = `${getApiBase()}${path}`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const authRetry =
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/register") &&
    !path.startsWith("/auth/refresh");

  const doFetch = () =>
    fetch(url, { ...options, headers, credentials: "include", signal: controller.signal });

  try {
    let res = await doFetch();
    if (res.status === 401 && authRetry && (await tryRefreshSession())) {
      headers.set("Authorization", `Bearer ${getToken() || ""}`);
      res = await doFetch();
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.detail || err?.error?.message || res.statusText;
      if (import.meta.env.DEV) {
        console.warn("[apiFetch]", res.status, path, msg);
      }
      throw new Error(typeof msg === "string" ? msg : "No fue posible completar la solicitud.");
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiConnectionError(CONNECT_HELP, e);
    }
    if (e instanceof TypeError || (e instanceof Error && e.message === "Failed to fetch")) {
      if (import.meta.env.DEV) {
        console.error("[apiFetch] conexión fallida", { url, path, base: getApiBase() });
      }
      throw new ApiConnectionError(CONNECT_HELP, e);
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
