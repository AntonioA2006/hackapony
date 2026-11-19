import { describe, expect, it } from "vitest";
import {
  API_BBOX_MAX_LAT_SPAN,
  API_BBOX_MAX_LON_SPAN,
  MAP_OPERATING_BOUNDS,
  boundsToQueryBBox,
  clipToOperatingArea,
  formatBBox,
} from "./viewportBbox";

describe("viewport bbox", () => {
  it("recorta una vista mundial a la zona de operación y cabe en el techo del API", () => {
    const clipped = clipToOperatingArea({ minLon: -180, minLat: -90, maxLon: 180, maxLat: 90 });
    expect(clipped).toEqual({
      minLon: MAP_OPERATING_BOUNDS.minLon,
      minLat: MAP_OPERATING_BOUNDS.minLat,
      maxLon: MAP_OPERATING_BOUNDS.maxLon,
      maxLat: MAP_OPERATING_BOUNDS.maxLat,
    });
    expect(clipped!.maxLon - clipped!.minLon).toBeLessThanOrEqual(API_BBOX_MAX_LON_SPAN);
    expect(clipped!.maxLat - clipped!.minLat).toBeLessThanOrEqual(API_BBOX_MAX_LAT_SPAN);
  });

  it("deja igual un viewport que ya está dentro de México", () => {
    const cdmx = { minLon: -99.2, minLat: 19.3, maxLon: -99.0, maxLat: 19.5 };
    expect(clipToOperatingArea(cdmx)).toEqual(cdmx);
    expect(formatBBox(cdmx)).toBe("-99.200000,19.300000,-99.000000,19.500000");
  });

  it("no pide nada si la vista no toca la zona de operación", () => {
    expect(clipToOperatingArea({ minLon: 2, minLat: 48, maxLon: 3, maxLat: 49 })).toBeNull();
    expect(
      boundsToQueryBBox({
        getWest: () => 2,
        getSouth: () => 48,
        getEast: () => 3,
        getNorth: () => 49,
      }),
    ).toBeNull();
  });

  it("formatea el viewport de Leaflet ya recortado", () => {
    expect(
      boundsToQueryBBox({
        getWest: () => -140,
        getSouth: () => 19,
        getEast: () => -99,
        getNorth: () => 20,
      }),
    ).toBe("-122.500000,19.000000,-99.000000,20.000000");
  });
});
