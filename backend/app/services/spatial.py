from uuid import UUID

from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.domain.enums import ReportStatus
from app.models.entities import CensusArea, Report


def point_wkt(lat: float, lon: float) -> WKTElement:
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


def locate(db: Session, lat: float, lon: float) -> tuple[UUID | None, UUID | None]:
    """Devuelve (census_area_id, municipality_id) del punto; None si no hay cobertura territorial.

    Punto-en-polígono con ST_Covers sobre geometry (los bordes cuentan como dentro);
    desempate determinista por cvegeo si el punto cae en un borde compartido.
    """
    wkt = f"SRID=4326;POINT({lon} {lat})"
    census = db.execute(
        text(
            """
            SELECT ca.id, ca.municipality_id
            FROM census_areas ca
            WHERE ST_Covers(ca.geom, ST_GeomFromEWKT(:wkt))
            ORDER BY ca.cvegeo
            LIMIT 1
            """
        ),
        {"wkt": wkt},
    ).first()
    if census:
        return census[0], census[1]
    mun = db.execute(
        text(
            """
            SELECT m.id FROM municipalities m
            WHERE m.geom IS NOT NULL AND ST_Covers(m.geom::geometry, ST_GeomFromEWKT(:wkt))
            ORDER BY m.cvegeo
            LIMIT 1
            """
        ),
        {"wkt": wkt},
    ).first()
    return None, (mun[0] if mun else None)


def assign_territorial_context(db: Session, report: Report, lat: float, lon: float) -> None:
    """Asigna AGEB y municipio al reporte a través del ORM (sin UPDATE directo que deje el objeto obsoleto)."""
    report.census_area_id, report.municipality_id = locate(db, lat, lon)


def fetch_census_pob(db: Session, census_area_id: UUID | None) -> int | None:
    if not census_area_id:
        return None
    row = db.scalar(select(CensusArea.pob_total).where(CensusArea.id == census_area_id))
    return int(row) if row is not None else None


def reports_within_radius(
    db: Session,
    lat: float,
    lon: float,
    radius_m: float,
    exclude_user_id: UUID | None = None,
    limit: int = 10,
):
    wkt = f"SRID=4326;POINT({lon} {lat})"
    q = (
        select(Report)
        .where(
            Report.status != ReportStatus.rejected,
            func.ST_DWithin(
                Report.location,
                func.ST_GeogFromText(wkt),
                radius_m,
            ),
        )
        .order_by(
            func.ST_Distance(Report.location, func.ST_GeogFromText(wkt)),
        )
        .limit(limit)
    )
    if exclude_user_id:
        q = q.where(Report.user_id != exclude_user_id)
    return db.scalars(q).all()

def distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia aproximada en metros entre dos puntos WGS84."""
    import math

    radius = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


# El reporte tiene que caer junto a la persona: el GPS del celular no es exacto, pero no permite otro municipio.
MAX_REPORT_DISTANCE_M = 250.0


def point_in_mexico(db: Session, lat: float, lon: float) -> bool:
    """True si el punto cae en alguna entidad (polígonos INEGI). Si aún no hay estados cargados, no bloquea."""
    loaded = db.execute(text("SELECT EXISTS (SELECT 1 FROM states)")).scalar()
    if not loaded:
        return True
    return bool(
        db.execute(
            text("SELECT EXISTS (SELECT 1 FROM states WHERE ST_Covers(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)))"),
            {"lat": lat, "lon": lon},
        ).scalar()
    )
