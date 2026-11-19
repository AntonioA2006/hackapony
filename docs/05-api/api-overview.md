# API REST — Visión general

- **Base URL:** `/api/v1`
- **Formato:** JSON UTF-8; fechas ISO-8601 UTC (`timestamptz`).
- **Auth:** `Authorization: Bearer <access_token>` salvo rutas públicas indicadas.
- **Paginación:** `?page=1&page_size=20` (máx 100).
- **Ordenamiento:** `?sort=-created_at` (prefijo `-` descendente).
- **Filtros geográficos:** `bbox=minLon,minLat,maxLon,maxLat` o `lat`, `lon`, `radius_m`.

## Respuesta estándar éxito (lista)

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 0
}
```

## Respuesta estándar error

Ver [error-handling.md](./error-handling.md).

## Módulos y archivos

| Módulo | Documento |
|--------|-----------|
| Auth / usuarios | [authentication.md](./authentication.md) |
| Reportes | [reports-endpoints.md](./reports-endpoints.md) |
| Incidencias | [incidents-endpoints.md](./incidents-endpoints.md) |
| Estadísticas | [statistics-endpoints.md](./statistics-endpoints.md) |
| INEGI consulta | [incidents-endpoints.md](./incidents-endpoints.md#datos-territoriales) + sección INEGI abajo |

## Endpoints INEGI (consulta)

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/municipalities` | Autenticado |
| GET | `/municipalities/{cvegeo}` | Autenticado |
| GET | `/census-areas` | Autenticado |
| GET | `/census-areas/{cvegeo}` | Autenticado |
| GET | `/inegi/indicators` | Admin |
| GET | `/inegi/sources` | Superadmin |

## OpenAPI

FastAPI generará `/openapi.json`. La documentación Markdown es la **fuente funcional** previa a implementación.