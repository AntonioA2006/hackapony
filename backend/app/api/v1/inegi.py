import uuid
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.domain.enums import UserRole
from app.models.entities import CensusArea, DataImportRun, DataSourceCatalog, InegiIndicator, Municipality
from geoalchemy2.shape import from_shape
from shapely.geometry import shape

router = APIRouter(tags=["inegi"])


@router.get("/municipalities")
def list_municipalities(
    page: int = 1,
    page_size: int = 50,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page_size = min(max(page_size, 1), 100)
    rows = db.scalars(select(Municipality).offset((page - 1) * page_size).limit(page_size)).all()
    return [
        {"id": str(m.id), "cvegeo": m.cvegeo, "name": m.name, "pob_total": m.pob_total} for m in rows
    ]


@router.get("/census-areas")
def list_census(
    cve_ent: str | None = None,
    cve_mun: str | None = None,
    page: int = 1,
    page_size: int = 50,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page_size = min(max(page_size, 1), 100)
    q = select(CensusArea)
    if cve_ent:
        q = q.where(CensusArea.cve_ent == cve_ent)
    if cve_mun:
        q = q.where(CensusArea.cve_mun == cve_mun)
    rows = db.scalars(q.offset((page - 1) * page_size).limit(page_size)).all()
    return [{"cvegeo": c.cvegeo, "pob_total": c.pob_total, "ambito": c.ambito} for c in rows]


@router.get("/inegi/sources")
def sources(user=Depends(require_roles(UserRole.SUPERADMINISTRADOR)), db: Session = Depends(get_db)):
    rows = db.scalars(select(DataSourceCatalog)).all()
    return [
        {
            "source_key": s.source_key,
            "official_name": s.official_name,
            "source_url": s.source_url,
            "last_verified_at": s.last_verified_at,
        }
        for s in rows
    ]


@router.get("/inegi/indicators")
def indicators(
    municipality_id: uuid.UUID | None = None,
    user=Depends(require_roles(UserRole.ADMINISTRADOR, UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    q = select(InegiIndicator)
    if municipality_id:
        q = q.where(InegiIndicator.municipality_id == municipality_id)
    rows = db.scalars(q.limit(200)).all()
    return [
        {
            "municipality_id": str(r.municipality_id),
            "dataset_code": r.dataset_code,
            "variable_code": r.variable_code,
            "variable_label": r.variable_label,
            "value": float(r.value) if r.value is not None else None,
            "reference_year": r.reference_year,
        }
        for r in rows
    ]


@router.post("/inegi/import/wscatgeo/{cve_ent}")
async def import_wscatgeo_municipalities(
    cve_ent: str,
    user=Depends(require_roles(UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    """Importa municipios de una entidad desde INEGI wscatgeo (datos oficiales en tiempo de consulta)."""
    url = f"https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/{cve_ent.zfill(2)}"
    source = db.scalar(select(DataSourceCatalog).where(DataSourceCatalog.source_key == "wscatgeo_mgem"))
    if not source:
        source = DataSourceCatalog(
            source_key="wscatgeo_mgem",
            official_name="INEGI wscatgeo - AGEM",
            institution="INEGI",
            source_url="https://www.inegi.org.mx/servicios/catalogoUnico.html",
            last_verified_at=datetime.now(UTC),
        )
        db.add(source)
        db.flush()
    run = DataImportRun(source_id=source.id, status="running")
    db.add(run)
    db.flush()
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        features = data.get("features") or []
        upserted = 0
        for feat in features:
            props = feat.get("properties") or {}
            cvegeo = props.get("cvegeo") or props.get("CVEGEO")
            if not cvegeo:
                continue
            geom = feat.get("geometry")
            name = props.get("nomgeo") or props.get("NOMGEO") or "Sin nombre"
            pob = props.get("pob_total")
            try:
                pob_int = int(pob) if pob not in (None, "") else None
            except ValueError:
                pob_int = None
            cve_ent_v = str(props.get("cve_ent") or cve_ent).zfill(2)
            cve_mun_v = str(props.get("cve_mun") or cvegeo[-3:]).zfill(3)
            existing = db.scalar(select(Municipality).where(Municipality.cvegeo == str(cvegeo)))
            shp = from_shape(shape(geom), srid=4326) if geom else None
            if existing:
                existing.name = name
                existing.pob_total = pob_int
                if shp is not None:
                    existing.geom = shp
            else:
                db.add(
                    Municipality(
                        cve_ent=cve_ent_v,
                        cve_mun=cve_mun_v,
                        cvegeo=str(cvegeo),
                        name=name,
                        pob_total=pob_int,
                        geom=shp,
                    )
                )
            upserted += 1
        run.status = "success"
        run.finished_at = datetime.now(UTC)
        run.stats = {"rows_upserted": upserted, "source_url": url}
        db.commit()
        return {"import_run_id": str(run.id), "rows_upserted": upserted}
    except Exception as exc:
        run.status = "failed"
        run.finished_at = datetime.now(UTC)
        run.error_message = str(exc)
        db.commit()
        raise HTTPException(502, detail=f"Error importando INEGI: {exc}") from exc