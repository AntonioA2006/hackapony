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

En Compose el servicio `migrate` ejecuta `alembic upgrade head` y después `python -m scripts.load_inegi_seed`, cuando Postgres ya está healthy. `api` arranca solo si ese servicio termina con éxito (`depends_on: condition: service_completed_successfully`). La API no migra al iniciar. Definición: `docker-compose.yml`.

Fuera de Compose (CI o el anfitrión): `cd backend && alembic upgrade head && python -m scripts.load_inegi_seed`.

Pipeline de release: backup → `migrate` → smoke tests `/health` y `/health/ready`.

## Escalado post-MVP

- Worker Celery para ETL INEGI.
- CDN para frontend estático.