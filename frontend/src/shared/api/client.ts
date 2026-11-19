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

  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
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
