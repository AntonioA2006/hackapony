# Endpoints — Incidencias

## GET `/incidents/public`

| | |
|--|--|
| **Permiso** | Público |
| **Descripción** | Mapa ciudadano sin PII |

**Query:** `bbox`, `category`, `status`, `page`

**Response item**

```json
{
  "id": "uuid",
  "public_id": "INC-3F8A",
  "primary_category": "leak_public_road",
  "status": "open",
  "urgency_score": 72.5,
  "priority_band": "high",
  "latitude": 19.4326,
  "longitude": -99.1332,
  "report_count": 3,
  "confirmation_count": 5
}
```

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