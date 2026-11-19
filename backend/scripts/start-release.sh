#!/bin/sh
# Arranque para hosting de una sola instancia sin paso "pre-deploy" (p. ej. Render Free):
# hace de release (migraciones + datos INEGI, ambos idempotentes) y luego levanta la API.
# Con varias réplicas, ejecutar las dos primeras líneas como job de despliegue y arrancar solo uvicorn (H7).
set -eu
alembic upgrade head
python -m scripts.load_inegi_seed
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips='*'
