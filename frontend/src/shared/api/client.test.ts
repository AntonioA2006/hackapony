import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiBase } from "./client";

function mockLocation(parts: Partial<Location>) {
  const base = {
    hostname: "localhost",
    port: "5173",
    protocol: "http:",
    host: "localhost:5173",
    ...parts,
  };
  vi.stubGlobal("window", {
    location: base,
    setTimeout,
    clearTimeout,
  });
}

describe("getApiBase", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubEnv("VITE_API_BASE_URL", "");
  });

  it("usa ruta relativa en puerto 3080 (LAN nginx)", () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api/v1");
    mockLocation({ hostname: "10.27.62.22", port: "3080", host: "10.27.62.22:3080" });
    expect(getApiBase()).toBe("/api/v1");
  });

  it("corrige localhost embebido cuando el host es LAN", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api/v1");
    mockLocation({ hostname: "10.27.62.22", port: "3080", host: "10.27.62.22:3080" });
    expect(getApiBase()).toBe("http://10.27.62.22:3080/api/v1");
  });

  it("en Vite LAN usa puerto 8000 del anfitrion", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    mockLocation({ hostname: "192.168.1.50", port: "5173", host: "192.168.1.50:5173" });
    expect(getApiBase()).toBe("http://192.168.1.50:8000/api/v1");
  });
});