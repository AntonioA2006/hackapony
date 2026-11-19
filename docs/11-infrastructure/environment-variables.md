# Variables de entorno

## API

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | `postgresql+psycopg://user:pass@db:5432/agua_alerta` |
| `JWT_SECRET` | Sí | Secreto access token |
| `JWT_REFRESH_SECRET` | Sí | Secreto refresh |
| `JWT_ACCESS_TTL_MIN` | No | Default 15 |
| `JWT_REFRESH_TTL_DAYS` | No | Default 7 |
| `PHOTOS_PATH` | Sí | Ruta volumen fotos |
| `CORS_ORIGINS` | Sí | CSV orígenes |
| `GROUPING_DISTANCE_M` | No | Default 75 |
| `DUPLICATE_SUGGEST_RADIUS_M` | No | Default 50 |
| `PRIORITY_POP_REF` | No | Default 5000 |
| `LOG_LEVEL` | No | INFO |

## Frontend build

| Variable | Descripción |
|----------|-------------|
| `VITE_API_BASE_URL` | URL API pública |

## DB

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_USER` | |
| `POSTGRES_PASSWORD` | |
| `POSTGRES_DB` | `agua_alerta` |

No commitear valores reales; usar `.env.example` en Fase 1 implementación (fuera de alcance actual docs-only).