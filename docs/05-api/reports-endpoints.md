# Endpoints — Reportes

## POST `/reports`

| | |
|--|--|
| **Permiso** | `CIUDADANO`+ |
| **Descripción** | Crear reporte |

**Request (application/json)**

```json
{
  "title": "Fuga en banquetas",
  "description": "Sale agua constante desde ayer",
  "category": "leak_public_road",
  "severity": "medium",
  "latitude": 19.4326,
  "longitude": -99.1332,
  "address_reference": "Esquina Insurgentes",
  "reported_at": "2025-11-18T15:30:00Z"
}
```

**Response 201**

```json
{
  "id": "uuid",
  "public_id": "AA-7K2M9",
  "status": "received",
  "incident_id": null,
  "created_at": "2025-11-19T14:00:00Z",
  "nearby_suggestions": []
}
```

Si el servicio detecta incidencia cercana, puede incluir `nearby_suggestions` con `incident_id` para UI.

**Validaciones:** categoría enum; GPS requerido; rate limit.

## GET `/reports`

| | |
|--|--|
| **Permiso** | Admin lista global; ciudadano solo propios si no usa `/users/me/reports` |
| **Query** | `status`, `category`, `bbox`, `from`, `to`, paginación |

## GET `/reports/{id}`

Propietario o admin. Incluye fotos metadata, historial resumido.

## PATCH `/reports/{id}`

| | |
|--|--|
| **Permiso** | Ciudadano: solo antes de `under_review` (campos limitados). Admin: validación estados |

**Admin ejemplo**

```json
{
  "status": "rejected",
  "rejection_reason": "Imagen no corresponde a fuga de agua potable"
}
```

## GET `/reports/nearby`

Público o autenticado. Query: `lat`, `lon`, `radius_m` (default 50). No expone PII.

## POST `/reports/{id}/photos`

`multipart/form-data`, campo `file`. **201** metadata foto.

## GET `/reports/{id}/photos/{photo_id}/content`

Autenticado con permiso. Stream imagen.

## GET `/reports/{id}/history`

Propietario o admin. Lista eventos de reporte e incidencia vinculada.

```json
{
  "items": [
    {
      "at": "2025-11-19T14:00:00Z",
      "type": "status_changed",
      "from": "received",
      "to": "under_review",
      "actor_role": "ADMINISTRADOR"
    }
  ]
}
```