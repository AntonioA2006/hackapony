"""Genera el paquete de datos territoriales y de agua versionado en `backend/data/inegi/`.

Fuentes oficiales (INEGI, Términos de Libre Uso de la Información):
- Límites estatales y municipales: servicio wscatgeo v2 (Marco Geoestadístico vigente).
- Indicadores de agua por municipio: Censo de Población y Vivienda 2020, ITER nacional
  (VPH_AGUADV, VPH_AGUAFV, VPH_TINACO, VPH_CISTER sobre TVIVPARHAB).

Salida (archivos pequeños, aptos para el repositorio y para cargarse sin red al desplegar):
- states.geojson.gz          32 entidades, geometría simplificada
- municipalities.geojson.gz  ~2,470 municipios, geometría simplificada
- water_indicators.csv       indicadores de agua por municipio y entidad
- manifest.json              procedencia: URLs, fecha de descarga, metadatos de INEGI, tolerancia

Uso:
    python -m scripts.build_inegi_seed            # descarga y genera
    python -m scripts.build_inegi_seed --iter-zip ruta/iter_00_cpv2020_csv.zip
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import sys
import time
import zipfile
from datetime import UTC, datetime
from pathlib import Path

import httpx
from shapely.geometry import mapping, shape
from shapely.validation import make_valid

WSCATGEO = "https://gaia.inegi.org.mx/wscatgeo/v2"
ITER_URL = "https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/iter/iter_00_cpv2020_csv.zip"
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "inegi"

# ~0.0005° ≈ 55 m: suficiente para asignar estado/municipio a un reporte y dibujar el mapa,
# y reduce el volumen ~10x frente al Marco Geoestadístico completo.
SIMPLIFY_TOLERANCE_DEG = 0.0005
COORD_DECIMALS = 5  # ~1 m

ITER_COLUMNS = ["ENTIDAD", "MUN", "LOC", "TVIVPARHAB", "VPH_AGUADV", "VPH_AGUAFV", "VPH_TINACO", "VPH_CISTER"]


def _get_json(client: httpx.Client, url: str, retries: int = 4) -> dict:
    for attempt in range(retries):
        try:
            resp = client.get(url)
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPError, json.JSONDecodeError):
            if attempt == retries - 1:
                raise
            time.sleep(2**attempt)
    raise RuntimeError("unreachable")


def _round_coords(obj):
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(float(c), COORD_DECIMALS) for c in obj]
        return [_round_coords(c) for c in obj]
    return obj


def _simplify(geometry: dict) -> dict:
    geom = shape(geometry)
    if not geom.is_valid:
        geom = make_valid(geom)
    simple = geom.simplify(SIMPLIFY_TOLERANCE_DEG, preserve_topology=True)
    if simple.is_empty:
        simple = geom
    out = mapping(simple)
    out = {"type": out["type"], "coordinates": _round_coords(out["coordinates"])}
    if out["type"] == "Polygon":
        out = {"type": "MultiPolygon", "coordinates": [out["coordinates"]]}
    return out


def _int(v) -> int | None:
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def build_geometries(client: httpx.Client) -> tuple[dict, dict, dict]:
    states_raw = _get_json(client, f"{WSCATGEO}/geo/mgee/")
    meta = states_raw.get("metadatos") or {}
    states = []
    for feat in states_raw["features"]:
        p = feat["properties"]
        states.append(
            {
                "type": "Feature",
                "properties": {
                    "cve_ent": p["cve_ent"],
                    "name": p["nomgeo"],
                    "abbrev": p.get("nom_abrev"),
                    "pob_total": _int(p.get("pob_total")),
                    "viviendas_habitadas": _int(p.get("total_viviendas_habitadas")),
                },
                "geometry": _simplify(feat["geometry"]),
            }
        )
    states.sort(key=lambda f: f["properties"]["cve_ent"])

    municipalities = []
    for st in states:
        ent = st["properties"]["cve_ent"]
        print(f"  municipios de {ent} {st['properties']['name']}…", file=sys.stderr)
        data = _get_json(client, f"{WSCATGEO}/geo/mgem/{ent}")
        for feat in data["features"]:
            p = feat["properties"]
            municipalities.append(
                {
                    "type": "Feature",
                    "properties": {
                        "cvegeo": p["cvegeo"],
                        "cve_ent": p["cve_ent"],
                        "cve_mun": p["cve_mun"],
                        "name": p["nomgeo"],
                        "pob_total": _int(p.get("pob_total")),
                        "viviendas_habitadas": _int(p.get("total_viviendas_habitadas")),
                    },
                    "geometry": _simplify(feat["geometry"]),
                }
            )
    municipalities.sort(key=lambda f: f["properties"]["cvegeo"])
    return (
        {"type": "FeatureCollection", "features": states},
        {"type": "FeatureCollection", "features": municipalities},
        meta,
    )


def build_water_indicators(iter_zip: bytes) -> list[dict]:
    rows: list[dict] = []
    with zipfile.ZipFile(io.BytesIO(iter_zip)) as zf:
        name = next(n for n in zf.namelist() if n.endswith(".csv") and "conjunto_de_datos_iter" in n)
        with zf.open(name) as fh:
            reader = csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8-sig"))
            for r in reader:
                # Totales municipales (LOC=0000, MUN≠000) y estatales (MUN=000, LOC=0000); se omite el total nacional
                if r["LOC"] != "0000" or r["ENTIDAD"] == "00":
                    continue
                level = "state" if r["MUN"] == "000" else "municipality"
                cvegeo = r["ENTIDAD"] if level == "state" else r["ENTIDAD"] + r["MUN"]
                rows.append(
                    {
                        "level": level,
                        "cvegeo": cvegeo,
                        "viviendas": _int(r["TVIVPARHAB"]),
                        "con_agua_entubada": _int(r["VPH_AGUADV"]),
                        "sin_agua_entubada": _int(r["VPH_AGUAFV"]),
                        "con_tinaco": _int(r["VPH_TINACO"]),
                        "con_cisterna": _int(r["VPH_CISTER"]),
                    }
                )
    rows.sort(key=lambda x: (x["level"] != "state", x["cvegeo"]))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--iter-zip", type=Path, help="ZIP del ITER 2020 ya descargado (evita 36 MB de descarga)")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=240.0, headers={"User-Agent": "agua-alerta-etl"}) as client:
        print("Descargando límites estatales y municipales (wscatgeo)…", file=sys.stderr)
        states, municipalities, geo_meta = build_geometries(client)
        if args.iter_zip:
            iter_zip = args.iter_zip.read_bytes()
        else:
            print("Descargando ITER 2020…", file=sys.stderr)
            resp = client.get(ITER_URL)
            resp.raise_for_status()
            iter_zip = resp.content
    water = build_water_indicators(iter_zip)

    for fname, fc in (("states.geojson.gz", states), ("municipalities.geojson.gz", municipalities)):
        with gzip.open(OUT_DIR / fname, "wt", encoding="utf-8", compresslevel=9) as fh:
            json.dump(fc, fh, ensure_ascii=False, separators=(",", ":"))
    with open(OUT_DIR / "water_indicators.csv", "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(water[0].keys()))
        writer.writeheader()
        writer.writerows(water)

    manifest = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "license": "INEGI — Términos de Libre Uso de la Información (https://www.inegi.org.mx/inegi/terminos.html)",
        "geometries": {
            "source": f"{WSCATGEO}/geo/mgee/ y {WSCATGEO}/geo/mgem/{{cve_ent}}",
            "inegi_metadata": geo_meta,
            "simplify_tolerance_deg": SIMPLIFY_TOLERANCE_DEG,
            "states": len(states["features"]),
            "municipalities": len(municipalities["features"]),
        },
        "water_indicators": {
            "source": ITER_URL,
            "dataset": "INEGI. Censo de Población y Vivienda 2020, Principales resultados por localidad (ITER)",
            "variables": {
                "viviendas": "TVIVPARHAB — total de viviendas particulares habitadas",
                "con_agua_entubada": "VPH_AGUADV — disponen de agua entubada en el ámbito de la vivienda",
                "sin_agua_entubada": "VPH_AGUAFV — no disponen de agua entubada en el ámbito de la vivienda",
                "con_tinaco": "VPH_TINACO — disponen de tinaco",
                "con_cisterna": "VPH_CISTER — disponen de cisterna o aljibe",
            },
            "rows": len(water),
        },
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["geometries"] | {"water_rows": len(water)}, ensure_ascii=False), file=sys.stderr)


if __name__ == "__main__":
    main()
