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
| `CORS_ORIGIN_REGEX` | No | Regex orígenes LAN (ver defaults en `config.py`) |
| `HOST` / `PORT` | No | Referencia; uvicorn `0.0.0.0:8000` en Docker |
| `DOCKER_WEB_API_BASE_URL` | Build web | Debe ser `/api/v1` |
| `FIREBASE_PROJECT_ID` | No | Si está definido, la API acepta ID tokens de Firebase Auth además del JWT local |
| `GROUPING_DISTANCE_M` | No | Default 75 |
| `DUPLICATE_SUGGEST_RADIUS_M` | No | Default 50 |
| `PRIORITY_POP_REF` | No | Default 5000 |
| `LOG_LEVEL` | No | INFO |

## Frontend build

| Variable | Descripción |
|----------|-------------|
| `VITE_API_BASE_URL` | Solo en `frontend/.env.local` (dev Vite); no usar `localhost` para LAN |
| `VITE_MAP_TILE_URL` | Plantilla de teselas. Vacía → Esri World Light Gray (`{z}/{y}/{x}`). En Docker es build arg de `web` |
| `VITE_MAP_TILE_ATTRIBUTION` | HTML de atribución de la capa base. Se le añade el crédito de INEGI. Vacía → atribución Esri |
| `VITE_TILE_URL` / `VITE_TILE_ATTRIBUTION` | Alias anteriores. Se usan solo si `VITE_MAP_TILE_*` viene vacío |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Config web pública. El build de producción lee `frontend/.env.production`. En Docker, un valor en el `.env` de la raíz la sustituye; un valor vacío no se inyecta |

## DB

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_USER` | |
| `POSTGRES_PASSWORD` | |
| `POSTGRES_DB` | `agua_alerta` |

No commitear valores reales; usar `.env.example` en Fase 1 implementación (fuera de alcance actual docs-only).