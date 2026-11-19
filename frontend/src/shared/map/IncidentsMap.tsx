import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";

const bandColor: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#64748b",
};

type Incident = {
  id: string;
  public_id: string;
  latitude: number;
  longitude: number;
  priority_band: string;
  report_count: number;
  confirmation_count: number;
  primary_category: string;
};

type Props = {
  incidents: Incident[];
  center?: [number, number];
  onPick?: (lat: number, lon: number) => void;
  pickMode?: boolean;
};

function PinPicker({ onPick }: { onPick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function IncidentsMap({ incidents, center = [19.4326, -99.1332], onPick, pickMode }: Props) {
  const icon = (color: string) =>
    L.divIcon({
      className: "",
      html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white"></div>`,
    });

  return (
    <MapContainer center={center} zoom={13} className="h-[60vh] w-full rounded-lg border" scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pickMode && <PinPicker onPick={onPick} />}
      {incidents.map((inc) => (
        <Marker key={inc.id} position={[inc.latitude, inc.longitude]} icon={icon(bandColor[inc.priority_band] || "#0369A1")}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{inc.public_id}</p>
              <p>{inc.primary_category}</p>
              <p>Reportes: {inc.report_count}</p>
              <p>Confirmaciones: {inc.confirmation_count}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}