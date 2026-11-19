# Despliegue

## Entornos

| Entorno | Propósito |
|---------|-----------|
| `local` | Docker Compose dev |
| `staging` | Piloto municipal |
| `production` | Operación |

## MVP staging

1. VM o PaaS con Docker.
2. TLS terminación nginx/Caddy.
3. `docker compose -f compose.staging.yml up -d`.
4. Migraciones manuales primer deploy.
5. Seed superadmin una vez.

## Producción (recomendaciones)

- Managed PostgreSQL con PostGIS o contenedor con backups automáticos.
- Separar almacén fotos a S3-compatible.
- `uvicorn` workers = 2×CPU+1 detrás de proxy.
- Rotación secretos.

## Logs

JSON stdout; agregador (Loki/CloudWatch) propuesto.

## Migraciones

Pipeline: backup → `alembic upgrade` → smoke tests `/health`.

Ejemplo compose (solo documentación):

```yaml
# docs-only reference — implementar en Fase 1
services:
  db:
    image: postgis/postgis:16-3.4
  api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+psycopg://agua:agua@db:5432/agua_alerta
  web:
    build: ./frontend
```

## Escalado post-MVP

- Worker Celery para ETL INEGI.
- CDN para frontend estático.