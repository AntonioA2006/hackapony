import { useState, type FormEvent } from "react";
import { apiFetch, getApiBase } from "../shared/api/client";
import IncidentsMap from "../shared/map/IncidentsMap";

const CATEGORIES = [
  "leak_public_road",
  "broken_pipe",
  "public_infra_leak",
  "flood_from_leak",
  "supply_issue",
  "other_water",
] as const;

export default function ReportPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("leak_public_road");
  const [severity, setSeverity] = useState("medium");
  const [lat, setLat] = useState(19.4326);
  const [lon, setLon] = useState(-99.1332);
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState("");
  const [photos, setPhotos] = useState<FileList | null>(null);

  const useGps = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
      },
      () => setMsg("No se pudo obtener GPS"),
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const report = await apiFetch<{ id: string; public_id: string; nearby_suggestions?: { incident_id: string }[] }>(
        "/reports",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            description,
            category,
            severity,
            latitude: lat,
            longitude: lon,
            address_reference: address || null,
          }),
        },
      );
      if (photos) {
        for (const file of Array.from(photos).slice(0, 5)) {
          const fd = new FormData();
          fd.append("file", file);
          await fetch(`${getApiBase()}/reports/${report.id}/photos`, {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
            body: fd,
          });
        }
      }
      setMsg(`Reporte ${report.public_id} registrado.`);
    } catch (err) {
      setMsg((err as Error).message);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Nuevo reporte</h1>
        <input className="w-full rounded border p-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" required minLength={5} />
        <textarea className="w-full rounded border p-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" required minLength={10} rows={4} />
        <select className="w-full rounded border p-2" value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="w-full rounded border p-2" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          {["low", "medium", "high", "critical"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input className="w-full rounded border p-2" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Referencia del lugar" />
        <button type="button" className="rounded border px-3 py-1" onClick={useGps}>
          Usar mi ubicación
        </button>
        <p className="text-sm text-slate-600">
          Lat {lat.toFixed(5)}, Lon {lon.toFixed(5)} — clic en el mapa para ajustar
        </p>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPhotos(e.target.files)} />
        <button type="submit" className="rounded bg-primary-600 px-4 py-2 text-white">
          Enviar reporte
        </button>
        {msg && <p className="text-sm">{msg}</p>}
      </div>
      <IncidentsMap incidents={[]} center={[lat, lon]} pickMode onPick={(la, lo) => { setLat(la); setLon(lo); }} />
    </form>
  );
}