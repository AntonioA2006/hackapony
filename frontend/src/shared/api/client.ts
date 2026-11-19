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

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Errores pasajeros: sin conexión, servidor despertando (502/503/504) o límite momentáneo. */
export function isTransient(err: unknown): boolean {
  return err instanceof ApiConnectionError || (err instanceof ApiError && [429, 502, 503, 504].includes(err.status));
}

/** Reintenta una llamada mientras el servidor despierta (plan gratuito: hasta ~1 min). */
export async function withWakeRetry<T>(fn: () => Promise<T>, onWaiting?: () => void): Promise<T> {
  const delays = [2000, 4000, 8000, 12000, 15000, 20000];
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransient(err) || i >= delays.length) throw err;
      onWaiting?.();
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
}

/** Despierta la API en segundo plano al abrir el sitio, para que el login ya la encuentre lista. */
export function warmUpApi() {
  const base = getApiBase();
  const root = base.replace(/\/api\/v1\/?$/, "");
  void fetch(`${root}/health`, { mode: "cors", cache: "no-store" }).catch(() => undefined);
}

export type Tokens = {
  access_token: string;
  refresh_token: string;
};

export function getToken(): string | null {
  return localStorage.getItem("access_token");
}

/** Proveedor del token de acceso. Por defecto, el JWT propio; con Firebase, el ID token (se renueva solo). */
type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => getToken();

export function setTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

export async function authHeader(): Promise<Record<string, string>> {
  const token = await tokenProvider();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

const CONNECT_HELP = import.meta.env.PROD
  ? "No pudimos conectar con el servidor. Si es la primera visita en un rato, está despertando: inténtalo de nuevo en unos segundos."
  : "No se pudo conectar con el servidor. Verifica que Agua Alerta esté ejecutándose y que estés conectado a la misma red.";

// El plan gratuito de la API se suspende sin tráfico y tarda ~50 s en despertar.
const FETCH_TIMEOUT_MS = 70_000;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = await tokenProvider();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

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
      throw new ApiError(typeof msg === "string" ? msg : "No fue posible completar la solicitud.", res.status);
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
