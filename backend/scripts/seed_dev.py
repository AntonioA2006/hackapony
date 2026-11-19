"""Crea usuarios de desarrollo. Ejecutar: python -m scripts.seed_dev (desde backend/)"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.domain.enums import UserRole
from app.models.entities import User

USERS = [
    ("ciudadano@example.com", "Ciudadano Demo", UserRole.CIUDADANO, "Ciudadano123!"),
    ("admin@example.com", "Admin Demo", UserRole.ADMINISTRADOR, "Admin12345!"),
    ("super@example.com", "Super Demo", UserRole.SUPERADMINISTRADOR, "Super12345!"),
]


def main() -> None:
    db = SessionLocal()
    try:
        for email, name, role, pwd in USERS:
            if db.scalar(select(User).where(User.email == email)):
                continue
            db.add(User(email=email, display_name=name, role=role, password_hash=hash_password(pwd)))
        db.commit()
        print("Usuarios de desarrollo creados (sintéticos, no INEGI).")
    finally:
        db.close()


if __name__ == "__main__":
    main()