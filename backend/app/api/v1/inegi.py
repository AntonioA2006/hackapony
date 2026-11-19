from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.domain.enums import STAFF_ROLES, SUPERVISOR_ROLES, UserRole
from app.models.entities import CensusArea, DataSourceCatalog, InegiIndicator, Municipality
from app.services.inegi_import import import_ageb, import_municipalities, relink_territorial_context

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


@router.get("/municipalities/{cvegeo}")
def get_municipality(cvegeo: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    mun = db.scalar(select(Municipality).where(Municipality.cvegeo == cvegeo))
    if not mun:
        raise HTTPException(404, detail="Municipio no encontrado")
    return {"id": str(mun.id), "cvegeo": mun.cvegeo, "name": mun.name, "pob_total": mun.pob_total}


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
        q = q.where(CensusArea.cve_ent == cve_ent.zfill(2))
    if cve_mun:
        q = q.where(CensusArea.cve_mun == cve_mun.zfill(3))
    rows = db.scalars(q.offset((page - 1) * page_size).limit(page_size)).all()
    return [
        {
            "id": str(c.id),
            "cvegeo": c.cvegeo,
            "pob_total": c.pob_total,
            "ambito": c.ambito,
            "cve_ent": c.cve_ent,
            "cve_mun": c.cve_mun,
        }
        for c in rows
    ]


@router.get("/census-areas/{cvegeo}")
def get_census_area(cvegeo: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.scalar(select(CensusArea).where(CensusArea.cvegeo == cvegeo))
    if not row:
        raise HTTPException(404, detail="AGEB no encontrada")
    return {
        "id": str(row.id),
        "cvegeo": row.cvegeo,
        "pob_total": row.pob_total,
        "viviendas_habitadas": row.viviendas_habitadas,
        "ambito": row.ambito,
    }


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
    municipality_id: UUID | None = None,
    user=Depends(require_roles(*STAFF_ROLES)),
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


@router.post("/inegi/import/wscatgeo/{cve_ent}/municipalities")
async def import_wscatgeo_municipalities(
    cve_ent: str,
    user=Depends(require_roles(UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    try:
        return await import_municipalities(db, cve_ent)
    except Exception as exc:
        raise HTTPException(502, detail=f"Error importando municipios INEGI: {exc}") from exc


@router.post("/inegi/import/wscatgeo/{cve_ent}")
async def import_wscatgeo_municipalities_legacy(
    cve_ent: str,
    user=Depends(require_roles(UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    """Compatibilidad con ruta anterior."""
    try:
        return await import_municipalities(db, cve_ent)
    except Exception as exc:
        raise HTTPException(502, detail=f"Error importando municipios INEGI: {exc}") from exc


@router.post("/inegi/import/wscatgeo/{cve_ent}/ageb")
async def import_wscatgeo_ageb_ent(
    cve_ent: str,
    user=Depends(require_roles(UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    """Importa AGEB urbana y rural de una entidad federativa."""
    try:
        return await import_ageb(db, cve_ent)
    except Exception as exc:
        raise HTTPException(502, detail=f"Error importando AGEB INEGI: {exc}") from exc


@router.post("/inegi/import/wscatgeo/{cve_ent}/{cve_mun}/ageb")
async def import_wscatgeo_ageb_municipality(
    cve_ent: str,
    cve_mun: str,
    user=Depends(require_roles(UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    """Importa AGEB de un municipio (recomendado para piloto)."""
    try:
        return await import_ageb(db, cve_ent, cve_mun)
    except Exception as exc:
        raise HTTPException(502, detail=f"Error importando AGEB INEGI: {exc}") from exc


@router.post("/inegi/relink-territorial")
def relink_territorial(
    user=Depends(require_roles(UserRole.SUPERADMINISTRADOR)),
    db: Session = Depends(get_db),
):
    """Reasigna municipio/AGEB a reportes e incidencias tras importación."""
    return relink_territorial_context(db)