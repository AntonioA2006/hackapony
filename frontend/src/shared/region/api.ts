import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection, Geometry } from "geojson";
import { apiFetch } from "../api/client";

export type Water = {
  viviendas: number;
  con_agua_entubada: number | null;
  sin_agua_entubada: number | null;
  con_tinaco: number | null;
  con_cisterna: number | null;
  pct_sin_agua_entubada: number | null;
  reference_year: number;
} | null;

export type StateItem = {
  cve_ent: string;
  name: string;
  abbrev: string | null;
  pob_total: number | null;
  bbox: [number, number, number, number] | null;
  center: [number, number] | null;
  water: Water;
  open_incidents: number;
};

export type MunicipalityItem = {
  cvegeo: string;
  name: string;
  pob_total: number | null;
  bbox: [number, number, number, number] | null;
  water: Water;
};

export type RegionFeatureCollection = FeatureCollection<Geometry, { id: string; name: string; water: Water }>;

const DAY = 24 * 60 * 60 * 1000;

export function useStates() {
  return useQuery({
    queryKey: ["regions", "states"],
    queryFn: () => apiFetch<{ items: StateItem[] }>("/regions/states").then((r) => r.items),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMunicipalities(cveEnt: string | null) {
  return useQuery({
    queryKey: ["regions", "municipalities", cveEnt],
    queryFn: () =>
      apiFetch<{ items: MunicipalityItem[] }>(`/regions/states/${cveEnt}/municipalities`).then((r) => r.items),
    enabled: Boolean(cveEnt),
    staleTime: DAY,
  });
}

export function useStatesGeo() {
  return useQuery({
    queryKey: ["regions", "states-geo"],
    queryFn: () => apiFetch<RegionFeatureCollection>("/regions/states.geojson"),
    staleTime: DAY,
  });
}

export function useMunicipalitiesGeo(cveEnt: string | null) {
  return useQuery({
    queryKey: ["regions", "municipalities-geo", cveEnt],
    queryFn: () => apiFetch<RegionFeatureCollection>(`/regions/states/${cveEnt}/municipalities.geojson`),
    enabled: Boolean(cveEnt),
    staleTime: DAY,
  });
}
