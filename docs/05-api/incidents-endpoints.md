# Endpoints — Incidencias

## GET `/incidents/public`

| | |
|--|--|
| **Permiso** | Público |
| **Descripción** | Mapa ciudadano sin PII. D5: filtra por viewport y no publica el punto exacto |

**Query**

| Parámetro | Regla |
|-----------|--------|
| `bbox` | Opcional. `minLon,minLat,maxLon,maxLat` en WGS84. Cuatro números finitos, `min < max`, longitud en [−180, 180], latitud en [−90, 90], a lo más 50° de ancho y 40° de alto. 422 si no cumple. Sin `bbox` la ruta sigue respondiendo (compatibilidad). |
| `cve_ent`, `cvegeo` | Opcionales. Recortan por entidad o municipio INEGI. |
| `page` | Default 1. Valores &lt; 1 se tratan como 1. |
| `page_size` | Default 100. Se recorta a 1…200. Pedir 500 no es error: la respuesta trae `page_size: 200`. |

El filtro espacial usa `public_location` (índice GiST), no el centroide. `latitude` / `longitude` son ese punto: snap a una malla de ~30 m más un desplazamiento estable derivado de HMAC(`LOCATION_HMAC_SECRET`, id). Ver [ADR-016](../13-decisions/adr-016-ubicacion-publica.md). Solo entran incidencias abiertas con al menos un reporte `validated`. Quien no administra no ve las que apenas se enviaron. Orden: urgencia descendente. `Cache-Control: public, max-age=30`.

## GET `/incidents/map`

| | |
|--|--|
| **Permiso** | `ADMINISTRADOR` o `SUPERADMINISTRADOR` |
| **Descripción** | El mismo viewport, con todas las incidencias abiertas que no estén rechazadas |

Mismos `bbox` y `page_size` que el mapa público. `latitude` / `longitude` son el centroide real. `awaiting_validation` es verdadero si ningún reporte vinculado está `validated`. Un usuario `CIUDADANO` recibe 403.

**Response item**

```json
{
  "id": "uuid",
  "public_id": "INC-3F8A",
  "primary_category": "leak_public_road",
  "status": "open",
  "urgency_score": 72.5,
  "priority_band": "high",
  "latitude": 19.43271,
  "longitude": -99.13308,
  "report_count": 3,
  "confirmation_count": 5
}
```

Las coordenadas del ejemplo son ilustrativas: no coinciden con el centroide operativo. `GET /incidents/{id}` (admin) sí devuelve el centroide real.

## POST `/incidents/{id}/confirm`

| | |
|--|--|
| **Permiso** | `CIUDADANO` autenticado |
| **Descripción** | Corroborar incidencia pública |

**Request:** vacío o `{ "note": "opcional" }` (nota no pública en MVP).

**Response 201:** `{ "confirmation_count": 6 }`  
**409:** `DUPLICATE_CONFIRMATION`

## GET `/incidents`

Admin. Filtros: `status`, `priority_band`, `municipality_id`, fechas, bbox, `sort=-urgency_score`.

## GET `/incidents/priority`

Admin. Top N por urgencia (default 20).

## GET `/incidents/{id}`

Admin detalle: reportes vinculados (con fotos), historial, desglose urgencia.

## PATCH `/incidents/{id}`

Admin actualiza `status`, notas internas, `severity` agregada.

## POST `/incidents/{id}/group-reports`

Admin. Body: `{ "report_ids": ["uuid", "..."] }`. Auditoría en `incident_history`.

## GET `/incidents/{id}/history`

Admin historial completo (`incident_history`).

## Datos territoriales

Ver también [api-overview.md](./api-overview.md) rutas `/municipalities`, `/census-areas`, `/inegi/*`.