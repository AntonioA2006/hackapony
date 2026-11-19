import L, { type LatLngBoundsExpression, type PathOptions } from "leaflet";
import type { Feature, Geometry } from "geojson";
import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, GeoJSON, MapContainer, Marker, Pane, Polygon, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { BAND_LABELS, CATEGORY_LABELS, fmtPct, label } from "../labels";
import { useMexicoOutline, type RegionFeatureCollection, type Water } from "../region/api";
import { mapTileAttribution, mapTileUrl } from "./tileConfig";
import { MAP_OPERATING_BOUNDS, VIEWPORT_DEBOUNCE_MS, boundsToQueryBBox } from "./viewportBbox";
import { BAND_COLORS, BAND_RADIUS, waterColor } from "./waterScale";

export type MapIncident = {
  validated?: boolean;
  leak_flow?: string | null;
  state_name?: string | null;
  municipality_name?: string | null;
  id: string;
  public_id: string;
  latitude: number;
  longitude: number;
  priority_band: string;
  report_count: number;
  confirmation_count: number;
  primary_category: string;
  awaiting_validation?: boolean;
};

export const MEXICO_BOUNDS: LatLngBoundsExpression = [
  [14.4, -118.6],
  [32.8, -86.6],
];
// Margen para poder desplazarse un poco más allá de la frontera sin salir de la región
const MAX_BOUNDS: LatLngBoundsExpression = [
  [MAP_OPERATING_BOUNDS.minLat, MAP_OPERATING_BOUNDS.minLon],
  [MAP_OPERATING_BOUNDS.maxLat, MAP_OPERATING_BOUNDS.maxLon],
];
const WORLD_RING: [number, number][] = [
  [-89, -179.9],
  [89, -179.9],
  [89, 179.9],
  [-89, 179.9],
];

/** Sombrea todo lo que está fuera de México: la plataforma solo opera en territorio nacional. */
function OutsideMexicoMask() {
  const outline = useMexicoOutline();
  const rings = useMemo(() => {
    const g = outline.data?.geometry;
    if (!g) return null;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    const holes = polys.map((p) => p[0].map(([lon, lat]) => [lat, lon] as [number, number]));
    return [WORLD_RING, ...holes];
  }, [outline.data]);
  if (!rings) return null;
  return (
    <Polygon
      positions={rings}
      pane="mask"
      interactive={false}
      pathOptions={{ stroke: true, color: "#9fb4c7", weight: 1, fillColor: "#f5f9fc", fillOpacity: 0.88 }}
    />
  );
}

type Props = {
  incidents?: MapIncident[];
  regions?: RegionFeatureCollection;
  selectedRegionId?: string | null;
  onRegionClick?: (id: string, name: string) => void;
  bounds?: LatLngBoundsExpression | null;
  center?: [number, number];
  zoom?: number;
  pickMode?: boolean;
  /** Punto elegido en modo selección (se dibuja el pin solo si existe). */
  pin?: [number, number] | null;
  onPick?: (lat: number, lon: number) => void;
  className?: string;
  onConfirm?: (id: string) => void;
  /** Ubicación exacta a enfocar (desde un reporte o incidencia): vuela ahí con marcador pulsante. */
  focus?: { lat: number; lon: number; id?: string | null } | null;
  /** Color por región (id de estado o municipio) para la capa de incidencias del personal. */
  regionColors?: Record<string, string> | null;
  /** Enlace a la ficha del personal desde el popup. */
  detailHref?: (id: string) => string;
  /** bbox del viewport ya recortado, o null si la vista no toca la zona de operación. */
  onViewportChange?: (bbox: string | null) => void;
};

const focusIcon = L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="aa-focus-pin"></div>' });

function FlyTo({ focus }: { focus?: Props["focus"] }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lon], 17, { duration: 1.2 });
  }, [map, focus?.lat, focus?.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function FitBounds({ bounds }: { bounds?: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13, animate: false });
  }, [map, bounds]);
  return null;
}

function ViewportReporter({ onChange }: { onChange: (bbox: string | null) => void }) {
  const map = useMap();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => onChangeRef.current(boundsToQueryBBox(map.getBounds())), VIEWPORT_DEBOUNCE_MS);
    };
    map.on("moveend", schedule);
    schedule();
    return () => {
      window.clearTimeout(timer);
      map.off("moveend", schedule);
    };
  }, [map]);
  return null;
}

function Recenter({ center, zoom }: { center?: [number, number]; zoom: number }) {
  const map = useMap();
  const key = center ? `${center[0].toFixed(5)},${center[1].toFixed(5)}` : "";
  useEffect(() => {
    if (center) map.setView(center, Math.max(map.getZoom(), zoom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, zoom]);
  return null;
}

function PinPicker({ onPick }: { onPick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const pinIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: '<div style="width:22px;height:22px;border-radius:9999px;background:#0b84c6;border:3px solid #fff;box-shadow:rgba(0,0,0,.25) 0 2px 6px"></div>',
});

export default function IncidentsMap({
  incidents = [],
  regions,
  selectedRegionId,
  onRegionClick,
  bounds,
  center,
  zoom = 14,
  pickMode,
  pin,
  onPick,
  className = "h-[52vh] min-h-[240px] sm:h-[62vh] sm:min-h-[420px]",
  onConfirm,
  focus,
  regionColors,
  detailHref,
  onViewportChange,
}: Props) {
  const regionKey = useMemo(
    () =>
      regions
        ? `${regions.features.length}-${regions.features[0]?.properties.id}-${selectedRegionId}-${regionColors ? Object.keys(regionColors).length + JSON.stringify(regionColors).length : "agua"}`
        : "none",
    [regions, selectedRegionId, regionColors],
  );

  const style = (feature?: Feature<Geometry, { id: string; water: Water }>): PathOptions => {
    const selected = feature?.properties.id === selectedRegionId;
    if (regionColors) {
      const c = feature ? regionColors[feature.properties.id] : undefined;
      return {
        fillColor: c ?? "#ffffff",
        fillOpacity: c ? 0.62 : 0.15,
        color: selected ? "#0b2338" : "#c9d5e0",
        weight: selected ? 2 : 0.8,
      };
    }
    return {
      fillColor: waterColor(feature?.properties.water?.pct_sin_agua_entubada),
      fillOpacity: 0.72,
      color: selected ? "#0b2338" : "#ffffff",
      weight: selected ? 2 : 0.8,
    };
  };

  return (
    <MapContainer
      bounds={center ? undefined : MEXICO_BOUNDS}
      center={center}
      zoom={center ? zoom : undefined}
      className={`w-full touch-manipulation overflow-hidden rounded-card border border-line ${className}`}
      scrollWheelZoom
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={0.9}
      minZoom={4}
    >
      <TileLayer attribution={mapTileAttribution()} url={mapTileUrl()} maxNativeZoom={16} maxZoom={19} />
      <Pane name="mask" style={{ zIndex: 340 }} />
      <Pane name="regions" style={{ zIndex: 350 }} />
      <OutsideMexicoMask />
      <FitBounds bounds={focus ? null : bounds} />
      <FlyTo focus={focus} />
      {focus && <Marker position={[focus.lat, focus.lon]} icon={focusIcon} zIndexOffset={1000} />}
      {onViewportChange && !pickMode && <ViewportReporter onChange={onViewportChange} />}
      {regions && (
        <GeoJSON
          key={regionKey}
          pane="regions"
          data={regions}
          style={style as L.StyleFunction}
          onEachFeature={(feature, layer) => {
            const p = feature.properties as { id: string; name: string; water: Water };
            layer.bindTooltip(
              `<strong>${p.name}</strong><br/>Viviendas sin agua entubada: ${fmtPct(p.water?.pct_sin_agua_entubada)}`,
              { sticky: true, direction: "top", className: "aa-tooltip" },
            );
            if (onRegionClick) layer.on("click", () => onRegionClick(p.id, p.name));
          }}
        />
      )}
      {incidents.map((inc) => (
        <CircleMarker
          key={inc.id}
          center={[inc.latitude, inc.longitude]}
          radius={BAND_RADIUS[inc.priority_band] ?? 6}
          pathOptions={{
            color: inc.validated === false || inc.awaiting_validation ? "#0b2338" : "#ffffff",
            weight: 2,
            dashArray: inc.validated === false || inc.awaiting_validation ? "3 3" : undefined,
            fillColor: BAND_COLORS[inc.priority_band] ?? "#94a3b4",
            fillOpacity: 0.95,
          }}
          eventHandlers={{
            add: (e) => {
              if (focus?.id && focus.id === inc.id) setTimeout(() => e.target.openPopup(), 1300);
            },
          }}
        >
          <Popup>
            <div className="space-y-1 text-[13px]">
              <p className="font-mono text-[12px] text-warm">{inc.public_id}</p>
              <p className="font-medium text-ink">{label(CATEGORY_LABELS, inc.primary_category)}</p>
              {(inc.municipality_name || inc.state_name) && (
                <p className="text-warm">{[inc.municipality_name, inc.state_name].filter(Boolean).join(", ")}</p>
              )}
              {(inc.validated === false || inc.awaiting_validation) && <p className="text-[12px] font-medium text-[#7a5a05]">Sin validar todavía</p>}
              <p className="text-warm">
                Prioridad {label(BAND_LABELS, inc.priority_band).toLowerCase()} · {inc.report_count} reporte(s) ·{" "}
                {inc.confirmation_count} confirmación(es)
              </p>
              {detailHref && (
                <a href={detailHref(inc.id)} className="mr-2 inline-block rounded-full bg-cyan px-3 py-1 text-[12px] font-medium text-white">
                  Abrir ficha
                </a>
              )}
              {onConfirm && (
                <button
                  type="button"
                  className="mt-1 min-h-11 rounded-full border border-line px-4 py-2 text-[13px] text-ink hover:border-muted"
                  onClick={() => onConfirm(inc.id)}
                >
                  Yo también la vi
                </button>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {pickMode && (
        <>
          <PinPicker onPick={onPick} />
          <Recenter center={center} zoom={zoom} />
          {pin && <Marker position={pin} icon={pinIcon} />}
        </>
      )}
    </MapContainer>
  );
}
