"""Regiones (cobertura nacional segmentada por entidad y municipio) e indicadores de agua de INEGI.

Datos públicos y estáticos: se sirven con caché HTTP larga. La ubicación del usuario solo se usa
para resolver su estado/municipio en este servidor y no se almacena.
"""
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import check_rate_limit

router = APIRouter(prefix="/regions", tags=["regions"])

_STATIC_CACHE = "public, max-age=86400, stale-while-revalidate=604800"
_SOURCE = {
    "geometries": "INEGI. Marco Geoestadístico, diciembre de 2025 (wscatgeo)",
    "water": "INEGI. Censo de Población y Vivienda 2020, ITER",
}


def _water(row) -> dict | None:
    if row.viviendas is None:
        return None
    viv = row.viviendas or 0
    sin = row.sin_agua_entubada
    return {
        "viviendas": viv,
        "con_agua_entubada": row.con_agua_entubada,
        "sin_agua_entubada": sin,
        "con_tinaco": row.con_tinaco,
        "con_cisterna": row.con_cisterna,
        "pct_sin_agua_entubada": round(100 * sin / viv, 2) if viv and sin is not None else None,
        "reference_year": 2020,
    }


def _bbox(raw: str | None) -> list[float] | None:
    # Box2D devuelve "BOX(minx miny,maxx maxy)"
    if not raw:
        return None
    nums = raw.replace("BOX(", "").replace(")", "").replace(",", " ").split()
    return [round(float(n), 5) for n in nums]


@router.get("/states")
def list_states(response: Response, db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT s.cve_ent, s.name, s.abbrev, s.pob_total,
                   Box2D(s.geom)::text AS bbox,
                   ST_Y(ST_PointOnSurface(s.geom)) AS lat, ST_X(ST_PointOnSurface(s.geom)) AS lon,
                   w.viviendas, w.con_agua_entubada, w.sin_agua_entubada, w.con_tinaco, w.con_cisterna,
                   (SELECT count(*) FROM incidents i JOIN municipalities m ON m.id = i.municipality_id
                     WHERE m.cve_ent = s.cve_ent AND i.status NOT IN ('resolved', 'dismissed')) AS open_incidents
            FROM states s
            LEFT JOIN water_indicators w ON w.cvegeo = s.cve_ent
            ORDER BY s.cve_ent
            """
        )
    ).all()
    response.headers["Cache-Control"] = "public, max-age=300"
    return {
        "source": _SOURCE,
        "items": [
            {
                "cve_ent": r.cve_ent,
                "name": r.name,
                "abbrev": r.abbrev,
                "pob_total": r.pob_total,
                "bbox": _bbox(r.bbox),
                "center": [round(r.lat, 5), round(r.lon, 5)] if r.lat is not None else None,
                "water": _water(r),
                "open_incidents": r.open_incidents,
            }
            for r in rows
        ],
    }


@router.get("/states/{cve_ent}/municipalities")
def list_municipalities(cve_ent: str, response: Response, db: Session = Depends(get_db)):
    cve_ent = cve_ent.zfill(2)
    rows = db.execute(
        text(
            """
            SELECT m.cvegeo, m.name, m.pob_total, Box2D(m.geom)::text AS bbox,
                   w.viviendas, w.con_agua_entubada, w.sin_agua_entubada, w.con_tinaco, w.con_cisterna
            FROM municipalities m
            LEFT JOIN water_indicators w ON w.cvegeo = m.cvegeo
            WHERE m.cve_ent = :ent AND m.geom IS NOT NULL
            ORDER BY m.name
            """
        ),
        {"ent": cve_ent},
    ).all()
    if not rows:
        raise HTTPException(404, detail="Entidad no encontrada")
    response.headers["Cache-Control"] = _STATIC_CACHE
    return {
        "source": _SOURCE,
        "items": [
            {"cvegeo": r.cvegeo, "name": r.name, "pob_total": r.pob_total, "bbox": _bbox(r.bbox), "water": _water(r)}
            for r in rows
        ],
    }


def _feature_collection(db: Session, sql: str, params: dict) -> dict:
    rows = db.execute(text(sql), params).all()
    return {
        "type": "FeatureCollection",
        "source": _SOURCE,
        "features": [
            {
                "type": "Feature",
                "id": r.id,
                "properties": {"id": r.id, "name": r.name, "water": _water(r)},
                "geometry": json.loads(r.geometry),
            }
            for r in rows
        ],
    }


@router.get("/states.geojson")
def states_geojson(
    response: Response,
    tolerance: float = Query(0.02, ge=0.0, le=0.2, description="Simplificación en grados para vista nacional"),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = _STATIC_CACHE
    return _feature_collection(
        db,
        """
        SELECT s.cve_ent AS id, s.name,
               ST_AsGeoJSON(ST_SimplifyPreserveTopology(s.geom, :tol), 4) AS geometry,
               w.viviendas, w.con_agua_entubada, w.sin_agua_entubada, w.con_tinaco, w.con_cisterna
        FROM states s LEFT JOIN water_indicators w ON w.cvegeo = s.cve_ent
        ORDER BY s.cve_ent
        """,
        {"tol": tolerance},
    )


@router.get("/states/{cve_ent}/municipalities.geojson")
def municipalities_geojson(
    cve_ent: str,
    response: Response,
    tolerance: float = Query(0.002, ge=0.0, le=0.05),
    db: Session = Depends(get_db),
):
    fc = _feature_collection(
        db,
        """
        SELECT m.cvegeo AS id, m.name,
               ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.geom, :tol), 5) AS geometry,
               w.viviendas, w.con_agua_entubada, w.sin_agua_entubada, w.con_tinaco, w.con_cisterna
        FROM municipalities m LEFT JOIN water_indicators w ON w.cvegeo = m.cvegeo
        WHERE m.cve_ent = :ent AND m.geom IS NOT NULL
        ORDER BY m.cvegeo
        """,
        {"ent": cve_ent.zfill(2), "tol": tolerance},
    )
    if not fc["features"]:
        raise HTTPException(404, detail="Entidad no encontrada")
    response.headers["Cache-Control"] = _STATIC_CACHE
    return fc


@router.get("/locate")
def locate_point(
    request: Request,
    response: Response,
    lat: float = Query(..., ge=14.0, le=33.5),
    lon: float = Query(..., ge=-118.5, le=-86.5),
    db: Session = Depends(get_db),
):
    """Resuelve estado y municipio de un punto en México. No guarda la ubicación."""
    check_rate_limit(f"locate:{request.client.host if request.client else 'unknown'}", max_calls=60, window_seconds=60)
    row = db.execute(
        text(
            """
            SELECT m.cvegeo, m.name AS municipality, s.cve_ent, s.name AS state
            FROM municipalities m JOIN states s ON s.cve_ent = m.cve_ent
            WHERE ST_Covers(m.geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
            ORDER BY m.cvegeo
            LIMIT 1
            """
        ),
        {"lat": lat, "lon": lon},
    ).first()
    response.headers["Cache-Control"] = "no-store"
    if row is None:
        state = db.execute(
            text(
                "SELECT cve_ent, name FROM states WHERE ST_Covers(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) LIMIT 1"
            ),
            {"lat": lat, "lon": lon},
        ).first()
        if state is None:
            raise HTTPException(404, detail="La ubicación está fuera del territorio cubierto")
        return {"state": {"cve_ent": state.cve_ent, "name": state.name}, "municipality": None}
    return {
        "state": {"cve_ent": row.cve_ent, "name": row.state},
        "municipality": {"cvegeo": row.cvegeo, "name": row.municipality},
    }
