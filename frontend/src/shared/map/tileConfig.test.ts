import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TILE_ATTRIBUTION, DEFAULT_TILE_URL, mapTileAttribution, mapTileUrl } from "./tileConfig";

describe("map tiles", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa Esri World Light Gray cuando no hay URL", () => {
    vi.stubEnv("VITE_MAP_TILE_URL", " ");
    vi.stubEnv("VITE_TILE_URL", "");
    vi.stubEnv("VITE_MAP_TILE_ATTRIBUTION", "");
    vi.stubEnv("VITE_TILE_ATTRIBUTION", "");
    expect(mapTileUrl()).toBe(DEFAULT_TILE_URL);
    expect(mapTileAttribution()).toContain(DEFAULT_TILE_ATTRIBUTION);
    expect(mapTileAttribution()).toContain("INEGI");
  });

  it("prefiere VITE_MAP_TILE_* sobre el alias VITE_TILE_*", () => {
    vi.stubEnv("VITE_MAP_TILE_URL", " https://tiles.example/{z}/{x}/{y}.png ");
    vi.stubEnv("VITE_TILE_URL", "https://alias.example/{z}/{x}/{y}.png");
    vi.stubEnv("VITE_MAP_TILE_ATTRIBUTION", "© Example");
    vi.stubEnv("VITE_TILE_ATTRIBUTION", "© Alias");
    expect(mapTileUrl()).toBe("https://tiles.example/{z}/{x}/{y}.png");
    expect(mapTileAttribution().startsWith("© Example")).toBe(true);
  });

  it("acepta el alias VITE_TILE_* si el nombre canónico está vacío", () => {
    vi.stubEnv("VITE_MAP_TILE_URL", "");
    vi.stubEnv("VITE_TILE_URL", "https://alias.example/{z}/{y}/{x}.png");
    vi.stubEnv("VITE_MAP_TILE_ATTRIBUTION", "");
    vi.stubEnv("VITE_TILE_ATTRIBUTION", "© Alias");
    expect(mapTileUrl()).toBe("https://alias.example/{z}/{y}/{x}.png");
    expect(mapTileAttribution().startsWith("© Alias")).toBe(true);
  });
});
