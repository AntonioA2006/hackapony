import { describe, expect, it } from "vitest";
import { clusterCellDegrees, clusterIncidents } from "./clusterIncidents";

describe("clusterIncidents", () => {
  it("junta puntos de la misma celda y deja solos los lejanos", () => {
    const groups = clusterIncidents(
      [
        { id: "a", latitude: 19.43, longitude: -99.13 },
        { id: "b", latitude: 19.44, longitude: -99.14 },
        { id: "c", latitude: 21.1, longitude: -101.2 },
      ],
      0.4,
    );
    const sizes = groups.map((g) => g.items.length).sort();
    expect(sizes).toEqual([1, 2]);
  });

  it("no agrupa cuando el zoom ya permite ver cada punto", () => {
    expect(clusterCellDegrees(8)).toBeNull();
    expect(clusterCellDegrees(5)).toBeGreaterThan(clusterCellDegrees(7) ?? 0);
  });
});