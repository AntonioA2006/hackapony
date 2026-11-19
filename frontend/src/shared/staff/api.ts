import { useQuery } from "@tanstack/react-query";
import { apiFetch, authHeader, getApiBase } from "../api/client";
import type { MapIncident } from "../map/IncidentsMap";

export type Incident = MapIncident & {
  status: string;
  urgency_score: number;
  opened_at: string | null;
  updated_at: string;
  closed_at: string | null;
  aggregated_severity: string;
  cve_ent: string | null;
  cvegeo: string | null;
  assigned_to: { id: string; display_name: string } | null;
  estimated_liters: number | null;
};

export type Dashboard = {
  scope: { cve_ent: string | null; days: number };
  totals: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    dismissed: number;
    unassigned: number;
    critical_open: number;
    mine_open: number;
    mine_resolved: number;
    avg_resolution_h: number | null;
    liters_open: number;
    liters_resolved: number;
  };
  by_area: { id: string | null; name: string; total: number; active: number; pct: number }[];
  by_category: { key: string; total: number }[];
  by_band: { key: string; total: number }[];
  by_flow: { key: string; total: number; liters: number }[];
  timeline: { day: string; opened: number; resolved: number }[];
  flow_rates_lph: Record<string, number>;
};

export type RegionCounts = { id: string; active: number; critical: number; high: number; medium: number; low: number };

export type StaffUser = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  open_assigned: number;
  resolved_total: number;
};

export type DetailReport = {
  id: string;
  public_id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  leak_flow: string | null;
  status: string;
  address_reference: string | null;
  created_at: string;
  lat: number;
  lon: number;
  reporter: string;
  contact_phone: string | null;
  photos: { id: string; mime_type: string; size_bytes: number }[];
};

export type IncidentDetail = {
  incident: Incident;
  reports: DetailReport[];
  history: { at: string; type: string; payload: Record<string, unknown> | null; actor: string | null }[];
  photos_purged_at: string | null;
};

export function useDashboard(cveEnt: string | null, days: number) {
  const q = new URLSearchParams({ days: String(days) });
  if (cveEnt) q.set("cve_ent", cveEnt);
  return useQuery({
    queryKey: ["staff-dashboard", cveEnt, days],
    queryFn: () => apiFetch<Dashboard>(`/statistics/staff-dashboard?${q}`),
    refetchInterval: 60_000,
  });
}

export function useRegionCounts(cveEnt: string | null, enabled = true) {
  return useQuery({
    queryKey: ["incidents-by-region", cveEnt],
    queryFn: () =>
      apiFetch<{ level: string; items: RegionCounts[] }>(`/statistics/incidents-by-region${cveEnt ? `?cve_ent=${cveEnt}` : ""}`),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useTechnicians(enabled = true) {
  return useQuery({ queryKey: ["technicians"], queryFn: () => apiFetch<StaffUser[]>("/users/technicians"), enabled });
}

/** Descarga una foto privada con el token y devuelve un object URL (las fotos nunca son públicas). */
export async function fetchPhotoUrl(reportId: string, photoId: string): Promise<string> {
  const res = await fetch(`${getApiBase()}/reports/${reportId}/photos/${photoId}/content`, { headers: await authHeader() });
  if (!res.ok) throw new Error("No se pudo cargar la foto");
  return URL.createObjectURL(await res.blob());
}
