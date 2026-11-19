"""Importación de capas INEGI vía wscatgeo (datos oficiales al momento de la consulta)."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import httpx
from geoalchemy2.shape import from_shape
from shapely.geometry import shape
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.entities import CensusArea, DataImportRun, DataSourceCatalog, Municipality
from app.services.priority import recalculate_incident_urgency
from app.services.spatial import assign_territorial_context, locate
from app.models.entities import Incident, Report


def _ensure_source(db: Session, source_key: str, official_name: str) -> DataSourceCatalog:
    source = db.scalar(select(DataSourceCatalog).where(DataSourceCatalog.source_key == source_key))
    if source:
        source.last_verified_at = datetime.now(UTC)
        return source
    source = DataSourceCatalog(
        source_key=source_key,
        official_name=official_name,
        institution="INEGI",
        source_url="https://www.inegi.org.mx/servicios/catalogoUnico.html",
        last_verified_at=datetime.now(UTC),
    )
    db.add(source)
    db.flush()
    return source


def _parse_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _municipality_id(db: Session, cve_ent: str, cve_mun: str) -> Any:
    cvegeo = f"{cve_ent.zfill(2)}{cve_mun.zfill(3)}"
    mun = db.scalar(select(Municipality).where(Municipality.cvegeo == cvegeo))
    return mun.id if mun else None


async def fetch_geojson(client: httpx.AsyncClient, url: str) -> dict:
    resp = await client.get(url)
    resp.raise_for_status()
    return resp.json()


async def import_municipalities(db: Session, cve_ent: str) -> dict:
    ent = cve_ent.zfill(2)
    url = f"https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/{ent}"
    source = _ensure_source(db, "wscatgeo_mgem", "INEGI wscatgeo - AGEM")
    run = DataImportRun(source_id=source.id, status="running")
    db.add(run)
    db.flush()
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            data = await fetch_geojson(client, url)
        upserted = 0
        for feat in data.get("features") or []:
            props = feat.get("properties") or {}
            cvegeo = props.get("cvegeo") or props.get("CVEGEO")
            if not cvegeo:
                continue
            geom = feat.get("geometry")
            name = props.get("nomgeo") or props.get("NOMGEO") or props.get("nom_mun") or "Sin nombre"
            cve_ent_v = str(props.get("cve_ent") or ent).zfill(2)
            cve_mun_v = str(props.get("cve_mun") or str(cvegeo)[-3:]).zfill(3)
            shp = from_shape(shape(geom), srid=4326) if geom else None
            existing = db.scalar(select(Municipality).where(Municipality.cvegeo == str(cvegeo)))
            pob = _parse_int(props.get("pob_total"))
            if existing:
                existing.name = name
                existing.pob_total = pob
                if shp is not None:
                    existing.geom = shp
            else:
                db.add(
                    Municipality(
                        cve_ent=cve_ent_v,
                        cve_mun=cve_mun_v,
                        cvegeo=str(cvegeo),
                        name=name,
                        pob_total=pob,
                        geom=shp,
                    )
                )
            upserted += 1
        run.status = "success"
        run.finished_at = datetime.now(UTC)
        run.stats = {"rows_upserted": upserted, "source_url": url}
        db.commit()
        return {"import_run_id": str(run.id), "rows_upserted": upserted, "source_url": url}
    except Exception as exc:
        run.status = "failed"
        run.finished_at = datetime.now(UTC)
        run.error_message = str(exc)
        db.commit()
        raise exc


async def import_ageb(
    db: Session,
    cve_ent: str,
    cve_mun: str | None = None,
) -> dict:
    ent = cve_ent.zfill(2)
    if cve_mun:
        mun = cve_mun.zfill(3)
        urls = [
            f"https://gaia.inegi.org.mx/wscatgeo/v2/geo/agebu/{ent}/{mun}",
            f"https://gaia.inegi.org.mx/wscatgeo/v2/geo/agebr/{ent}/{mun}",
        ]
        scope = f"{ent}-{mun}"
    else:
        urls = [
            f"https://gaia.inegi.org.mx/wscatgeo/v2/geo/agebu/{ent}",
            f"https://gaia.inegi.org.mx/wscatgeo/v2/geo/agebr/{ent}",
        ]
        scope = ent

    source = _ensure_source(db, "wscatgeo_ageb", "INEGI wscatgeo - AGEB")
    run = DataImportRun(source_id=source.id, status="running")
    db.add(run)
    db.flush()
    upserted = 0
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            for url in urls:
                data = await fetch_geojson(client, url)
                for feat in data.get("features") or []:
                    props = feat.get("properties") or {}
                    cvegeo = props.get("cvegeo") or props.get("CVEGEO")
                    if not cvegeo:
                        continue
                    geom = feat.get("geometry")
                    if not geom:
                        continue
                    cve_ent_v = str(props.get("cve_ent") or ent).zfill(2)
                    cve_mun_v = str(props.get("cve_mun") or "").zfill(3)[:3]
                    if len(cve_mun_v) < 3 and len(str(cvegeo)) >= 5:
                        cve_mun_v = str(cvegeo)[2:5]
                    cve_ageb = str(props.get("cve_ageb") or props.get("CVE_AGEB") or "")[:4]
                    if not cve_ageb and len(str(cvegeo)) >= 9:
                        cve_ageb = str(cvegeo)[5:9]
                    ambito = props.get("ambito") or ("Urbana" if "agebu" in url else "Rural")
                    pob = _parse_int(props.get("pob_total"))
                    viv = _parse_int(props.get("total_viviendas_habitadas"))
                    mun_id = _municipality_id(db, cve_ent_v, cve_mun_v)
                    shp = from_shape(shape(geom), srid=4326)
                    existing = db.scalar(select(CensusArea).where(CensusArea.cvegeo == str(cvegeo)))
                    if existing:
                        existing.pob_total = pob
                        existing.viviendas_habitadas = viv
                        existing.ambito = str(ambito)[:20] if ambito else None
                        existing.geom = shp
                        existing.municipality_id = mun_id
                    else:
                        db.add(
                            CensusArea(
                                municipality_id=mun_id,
                                cvegeo=str(cvegeo),
                                cve_ent=cve_ent_v,
                                cve_mun=cve_mun_v,
                                cve_ageb=cve_ageb or "0000",
                                ambito=str(ambito)[:20] if ambito else None,
                                geom=shp,
                                pob_total=pob,
                                viviendas_habitadas=viv,
                            )
                        )
                    upserted += 1
        run.status = "success"
        run.finished_at = datetime.now(UTC)
        run.stats = {"rows_upserted": upserted, "scope": scope, "urls": urls}
        db.commit()
        return {"import_run_id": str(run.id), "rows_upserted": upserted, "scope": scope}
    except Exception as exc:
        run.status = "failed"
        run.finished_at = datetime.now(UTC)
        run.error_message = str(exc)
        db.commit()
        raise exc


def relink_territorial_context(db: Session) -> dict:
    reports_updated = 0
    reports = db.scalars(select(Report)).all()
    for report in reports:
        row = db.execute(
            text("SELECT ST_Y(location::geometry), ST_X(location::geometry) FROM reports WHERE id = :id"),
            {"id": str(report.id)},
        ).one()
        assign_territorial_context(db, report, row[0], row[1])
        reports_updated += 1

    incidents_updated = 0
    incidents = db.scalars(select(Incident)).all()
    for inc in incidents:
        row = db.execute(
            text("SELECT ST_Y(centroid::geometry), ST_X(centroid::geometry) FROM incidents WHERE id = :id"),
            {"id": str(inc.id)},
        ).one()
        inc.census_area_id, inc.municipality_id = locate(db, row[0], row[1])
        recalculate_incident_urgency(db, inc)
        incidents_updated += 1

    db.commit()
    return {"reports_relinked": reports_updated, "incidents_relinked": incidents_updated}