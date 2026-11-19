# Agua Alerta (hackapony)

MVP según `docs/`.

## Requisitos

- **Docker Desktop en ejecución** (motor Linux) para PostGIS
- Python 3.12+
- Node 20+

## Arranque rápido

```bash
# Abre Docker Desktop y espera a que el motor esté "running"
cp .env.example .env   # Windows: copy .env.example .env
docker compose up -d db
cd backend && alembic upgrade head
cd backend && python -m scripts.seed_dev
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
```

- API: http://localhost:8000/docs
- Web (Docker): http://localhost:8081
- Web (dev): http://localhost:5173

Usuarios de desarrollo sintéticos (ver `seed_dev.py`).

## Pruebas

```bash
cd backend && pytest tests/test_priority.py -q
```