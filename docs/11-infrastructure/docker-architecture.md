# Docker — arquitectura MVP

## Servicios

| Servicio | Imagen base | Puerto en el host |
|----------|-------------|-------------------|
| `db` | `postgis/postgis:16-3.4` | ninguno en `docker-compose.yml`; `127.0.0.1:5432` con `compose.override.yml` |
| `migrate` | la misma imagen que `api` | ninguno; `alembic upgrade head` y `python -m scripts.load_inegi_seed`, luego termina |
| `api` | Python 3.12 slim + build | 8000 |
| `web` | node build → nginx alpine | 3080 y 8081 |

`docker compose up` fusiona `compose.override.yml` (recarga de uvicorn, montaje de `./backend` y el puerto de Postgres). El servicio `web` no se redefine ahí: la demo sigue en **:3080**. Para no aplicar el override: `docker compose -f docker-compose.yml up -d --build`.

## Red

Red bridge por defecto de Compose. `api` y `migrate` usan el hostname `db`.

## Volúmenes

| Volumen | Montaje |
|---------|---------|
| `pgdata` | `/var/lib/postgresql/data` |
| `./data/photos` | `/data/photos` en api |
| `./backend` | `/app` en `api` y `migrate`, solo en el override de desarrollo |

## Health checks

`db` usa `pg_isready`. `api` usa `GET /health/ready` (Postgres y PostGIS). `web` espera a que `api` esté healthy.

## Orden de arranque

`db` healthy → `migrate` (Alembic hasta `003` y paquete INEGI, tiene que salir 0) → `api` → `web`.

La API no ejecuta Alembic ni `load_inegi_seed`. Con varias réplicas, un solo job `migrate` corre antes de ellas.

Variables: [environment-variables.md](./environment-variables.md).