from uuid import UUID

from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.domain.enums import ReportStatus
from app.models.entities import CensusArea, Report


def point_wkt(lat: float, lon: float) -> WKTElement:
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


def assign_territorial_context(db: Session, report_id: UUID, lat: float, lon: float) -> None:
    wkt = f"SRID=4326;POINT({lon} {lat})"
    census = db.execute(
        text(
            """
            SELECT ca.id, ca.municipality_id
            FROM census_areas ca
            WHERE ST_Intersects(ca.geom, ST_GeomFromEWKT(:wkt))
            ORDER BY ST_Area(ST_Intersection(ca.geom, ST_GeomFromEWKT(:wkt))) DESC NULLS LAST
            LIMIT 1
            """
        ),
        {"wkt": wkt},
    ).first()
    municipality_id = None
    census_area_id = None
    if census:
        census_area_id, municipality_id = census
    else:
        mun = db.execute(
            text(
                """
                SELECT m.id FROM municipalities m
                WHERE m.geom IS NOT NULL AND ST_Intersects(m.geom::geometry, ST_GeomFromEWKT(:wkt))
                LIMIT 1
                """
            ),
            {"wkt": wkt},
        ).first()
        if mun:
            municipality_id = mun[0]

    db.execute(
        text(
            """
            UPDATE reports SET census_area_id = :ca, municipality_id = :mun WHERE id = :rid
            """
        ),
        {"ca": census_area_id, "mun": municipality_id, "rid": report_id},
    )


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