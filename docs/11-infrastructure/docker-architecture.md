# Docker — arquitectura MVP

## Servicios

| Servicio | Imagen base | Puerto |
|----------|-------------|--------|
| `db` | `postgis/postgis:16-3.4` | 5432 |
| `api` | Python 3.12 slim + build | 8000 |
| `web` | node build → nginx alpine | 8080 |

## Red

Red bridge `agua-alerta-net`; solo `api` conecta a `db`.

## Volúmenes

| Volumen | Montaje |
|---------|---------|
| `pgdata` | `/var/lib/postgresql/data` |
| `photos` | `/data/photos` en api |

## Health checks

```yaml
# Ejemplo conceptual (documentación)
db:
  healthcheck:
  test: ["CMD-SHELL", "pg_isready -U agua"]
api:
  healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
```

## Orden arranque

`db` healthy → `alembic upgrade head` → `api` → `web`.

Variables: [environment-variables.md](./environment-variables.md).