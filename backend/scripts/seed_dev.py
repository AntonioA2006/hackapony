"""Crea usuarios de desarrollo. Ejecutar: python -m scripts.seed_dev (desde backend/)"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.domain.enums import LeakSeverity, ReportCategory, ReportStatus, UserRole
from app.models.entities import Report, User
from app.services.grouping import process_report_grouping
from app.services.spatial import point_wkt

USERS = [
    ("ciudadano@example.com", "Ciudadano Demo", UserRole.CIUDADANO, "Ciudadano123!"),
    ("admin@example.com", "Admin Demo", UserRole.ADMINISTRADOR, "Admin12345!"),
    ("super@example.com", "Super Demo", UserRole.SUPERADMINISTRADOR, "Super12345!"),
]

LAN_DEMO_REPORT_ID = "AA-LANDEM1"


def _seed_lan_map_demo(db) -> None:
    """Incidencia validada visible en el mapa publico (pruebas LAN)."""
    user = db.scalar(select(User).where(User.email == "ciudadano@example.com"))
    if not user:
        return
    report = db.scalar(select(Report).where(Report.public_id == LAN_DEMO_REPORT_ID))
    if report:
        if report.status != ReportStatus.validated:
            report.status = ReportStatus.validated
        db.commit()
        return
    lat, lon = 19.4326, -99.1332
    report = Report(
        public_id=LAN_DEMO_REPORT_ID,
        user_id=user.id,
        title="Fuga demo LAN",
        description="Reporte sintetico para pruebas del equipo en red local.",
        category=ReportCategory.leak_public_road,
        severity=LeakSeverity.high,
        location=point_wkt(lat, lon),
        address_reference="Centro CDMX (demo)",
        status=ReportStatus.received,
    )
    db.add(report)
    db.flush()
    process_report_grouping(db, report, user.id)
    report.status = ReportStatus.validated
    db.commit()
    print(f"Mapa LAN: reporte {LAN_DEMO_REPORT_ID} validado en CDMX.")


def main() -> None:
    db = SessionLocal()
    try:
        for email, name, role, pwd in USERS:
            if db.scalar(select(User).where(User.email == email)):
                continue
            db.add(User(email=email, display_name=name, role=role, password_hash=hash_password(pwd)))
        db.commit()
        print("Usuarios de desarrollo creados (sintéticos, no INEGI).")
        _seed_lan_map_demo(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()