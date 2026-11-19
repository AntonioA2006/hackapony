"""Carga en la BD el paquete versionado de `backend/data/inegi/` (estados, municipios, agua).

Idempotente: guarda el hash del paquete en `data_import_runs`; si ya se cargó esa versión, no hace nada.
Sin red: solo lee archivos del repositorio. Se ejecuta en cada arranque del contenedor.

    python -m scripts.load_inegi_seed [--force]
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import logging
import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.entities import DataImportRun, DataSourceCatalog

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "inegi"
SOURCE_KEY = "inegi_seed_nacional"
log = logging.getLogger("load_inegi_seed")


def _bundle_hash() -> str:
    h = hashlib.sha256()
    for name in ("manifest.json", "states.geojson.gz", "municipalities.geojson.gz", "water_indicators.csv"):
        h.update((DATA_DIR / name).read_bytes())
    return h.hexdigest()


def _features(name: str) -> list[dict]:
    with gzip.open(DATA_DIR / name, "rt", encoding="utf-8") as fh:
        return json.load(fh)["features"]


def _source(db: Session) -> DataSourceCatalog:
    src = db.scalar(select(DataSourceCatalog).where(DataSourceCatalog.source_key == SOURCE_KEY))
    if src is None:
        src = DataSourceCatalog(
            source_key=SOURCE_KEY,
            official_name="INEGI — Marco Geoestadístico (wscatgeo) y Censo 2020 ITER (agua en viviendas)",
            institution="INEGI",
            source_url="https://www.inegi.org.mx/temas/agua/",
        )
        db.add(src)
        db.flush()
    src.last_verified_at = datetime.now(UTC)
    return src


def load(db: Session, force: bool = False) -> dict:
    bundle = _bundle_hash()
    src = _source(db)
    already = db.scalar(
        select(DataImportRun).where(
            DataImportRun.source_id == src.id,
            DataImportRun.status == "success",
            DataImportRun.stats["bundle_sha256"].astext == bundle,
        )
    )
    if already and not force:
        db.commit()
        return {"skipped": True, "bundle_sha256": bundle}

    run = DataImportRun(source_id=src.id, status="running")
    db.add(run)
    db.flush()

    states = _features("states.geojson.gz")
    db.execute(
        text(
            """
            INSERT INTO states (cve_ent, name, abbrev, pob_total, viviendas_habitadas, geom)
            VALUES (:cve_ent, :name, :abbrev, :pob_total, :viviendas_habitadas,
                    ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)))
            ON CONFLICT (cve_ent) DO UPDATE SET
                name = EXCLUDED.name, abbrev = EXCLUDED.abbrev, pob_total = EXCLUDED.pob_total,
                viviendas_habitadas = EXCLUDED.viviendas_habitadas, geom = EXCLUDED.geom
            """
        ),
        [f["properties"] | {"geom": json.dumps(f["geometry"])} for f in states],
    )

    municipalities = _features("municipalities.geojson.gz")
    db.execute(
        text(
            """
            INSERT INTO municipalities (id, cve_ent, cve_mun, cvegeo, name, pob_total, geom)
            VALUES (gen_random_uuid(), :cve_ent, :cve_mun, :cvegeo, :name, :pob_total,
                    ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)))
            ON CONFLICT (cvegeo) DO UPDATE SET
                cve_ent = EXCLUDED.cve_ent, cve_mun = EXCLUDED.cve_mun, name = EXCLUDED.name,
                pob_total = EXCLUDED.pob_total, geom = EXCLUDED.geom
            """
        ),
        [
            {k: f["properties"][k] for k in ("cve_ent", "cve_mun", "cvegeo", "name", "pob_total")}
            | {"geom": json.dumps(f["geometry"])}
            for f in municipalities
        ],
    )

    with open(DATA_DIR / "water_indicators.csv", encoding="utf-8") as fh:
        water = [{k: (int(v) if k not in ("level", "cvegeo") and v != "" else (v or None)) for k, v in r.items()} for r in csv.DictReader(fh)]
    db.execute(
        text(
            """
            INSERT INTO water_indicators
                (cvegeo, level, viviendas, con_agua_entubada, sin_agua_entubada, con_tinaco, con_cisterna, reference_year)
            VALUES (:cvegeo, :level, :viviendas, :con_agua_entubada, :sin_agua_entubada, :con_tinaco, :con_cisterna, 2020)
            ON CONFLICT (cvegeo) DO UPDATE SET
                level = EXCLUDED.level, viviendas = EXCLUDED.viviendas,
                con_agua_entubada = EXCLUDED.con_agua_entubada, sin_agua_entubada = EXCLUDED.sin_agua_entubada,
                con_tinaco = EXCLUDED.con_tinaco, con_cisterna = EXCLUDED.con_cisterna
            """
        ),
        water,
    )

    # Reportes e incidencias sin municipio (cargados antes que el territorio) se reubican.
    relinked = db.execute(
        text(
            """
            UPDATE reports r SET municipality_id = m.id
            FROM municipalities m
            WHERE r.municipality_id IS NULL AND ST_Covers(m.geom, r.location::geometry)
            """
        )
    ).rowcount
    db.execute(
        text(
            """
            UPDATE incidents i SET municipality_id = m.id
            FROM municipalities m
            WHERE i.municipality_id IS NULL AND ST_Covers(m.geom, i.centroid::geometry)
            """
        )
    )

    manifest = json.loads((DATA_DIR / "manifest.json").read_text(encoding="utf-8"))
    run.status = "success"
    run.finished_at = datetime.now(UTC)
    run.stats = {
        "bundle_sha256": bundle,
        "states": len(states),
        "municipalities": len(municipalities),
        "water_rows": len(water),
        "reports_relinked": relinked,
        "inegi_metadata": manifest["geometries"].get("inegi_metadata"),
    }
    db.commit()
    return run.stats


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="recargar aunque el paquete no haya cambiado")
    args = parser.parse_args()
    with SessionLocal() as db:
        result = load(db, force=args.force)
    print(json.dumps(result, ensure_ascii=False), file=sys.stderr)


if __name__ == "__main__":
    main()
