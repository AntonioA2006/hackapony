import { describe, expect, it } from "vitest";
import { parseCoordinate } from "./geo";

describe("parseCoordinate", () => {
  it("acepta punto o coma decimal dentro de México", () => {
    expect(parseCoordinate("19.4326", "lat")).toBeCloseTo(19.4326);
    expect(parseCoordinate(" -99,1332 ", "lon")).toBeCloseTo(-99.1332);
  });
  it("rechaza coordenadas fuera de México o inválidas", () => {
    expect(parseCoordinate("40.7", "lat")).toBeNull();
    expect(parseCoordinate("-74.0", "lon")).toBeNull();
    expect(parseCoordinate("abc", "lat")).toBeNull();
    expect(parseCoordinate("", "lon")).toBeNull();
  });
});
