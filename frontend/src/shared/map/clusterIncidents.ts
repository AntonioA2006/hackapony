export type ClusterPoint = { id: string; latitude: number; longitude: number };

export type IncidentCluster<T extends ClusterPoint> = {
  key: string;
  latitude: number;
  longitude: number;
  items: T[];
};

/** Agrupa puntos cercanos en una celda. Cada grupo de un solo punto se dibuja como marcador normal. */
export function clusterIncidents<T extends ClusterPoint>(items: T[], cellDegrees: number): IncidentCluster<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = `${Math.round(item.latitude / cellDegrees)}:${Math.round(item.longitude / cellDegrees)}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()].map(([key, group]) => ({
    key,
    latitude: group.reduce((sum, item) => sum + item.latitude, 0) / group.length,
    longitude: group.reduce((sum, item) => sum + item.longitude, 0) / group.length,
    items: group,
  }));
}

/** Por debajo de este zoom, y solo si hay varios puntos, el mapa agrupa. */
export function clusterCellDegrees(zoom: number): number | null {
  if (zoom >= 8) return null;
  if (zoom <= 5) return 1.6;
  if (zoom <= 6) return 0.8;
  return 0.4;
}
