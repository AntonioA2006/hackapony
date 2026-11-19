# Diccionario de datos

Convención: nombres en inglés en BD; etiquetas UI en español.

## `users`

| Campo | Descripción |
|-------|-------------|
| email | Identificador de login |
| role | `CIUDADANO` \| `ADMINISTRADOR` \| `SUPERADMINISTRADOR` |
| display_name | Nombre visible (no exponer en mapa público de terceros) |

## `reports`

| Campo | Descripción |
|-------|-------------|
| public_id | Folio corto legible (ej. base32) además de UUID |
| category | Taxonomía ciudadana; ver objectives |
| severity | Gravedad declarada o asignada por admin (`leak_severity`) |
| location | Punto WGS84 |
| address_reference | Texto libre "frente a..." |
| reported_at | Momento del hecho (opcional ciudadano) vs `created_at` servidor |

## `incidents`

| Campo | Descripción |
|-------|-------------|
| report_count | Reportes vinculados activos |
| centroid | Punto operativo (media de los reportes). No se publica |
| public_location | Punto del mapa público: snap ~30 m + jitter HMAC (ADR-016) |
| confirmation_count | Corroboraciones ciudadanas |
| urgency_score | 0–100, ver algoritmo |
| priority_band | Banda derivada del score |

## `report_photos`

| Campo | Descripción |
|-------|-------------|
| storage_key | Ruta relativa opaca en volumen |
| mime_type | `image/jpeg`, `image/png`, `image/webp` permitidos MVP |

## `citizen_confirmations`

Registro de "también lo vi" sin nuevo reporte.

## `notifications`

| type (ejemplos) | Momento |
|-----------------|---------|
| `report_received` | Tras POST report |
| `report_validated` | Admin valida |
| `report_rejected` | Con motivo en metadata |
| `incident_in_progress` | Incidencia en atención |
| `incident_resolved` | Cierre |

## `municipalities`

Claves INEGI: `cve_ent` (2), `cve_mun` (3), `cvegeo` concatenada oficial.

## `census_areas`

Unidad **AGEB** del Marco Geoestadístico. `cvegeo` 13 caracteres (verificado en metadatos servicio wscatgeo).

## `inegi_indicators`

Almacén desnormalizado de variables importadas (p. ej. módulo CNGMD agua).  
`dataset_code` ej. `cngmd2023_mod6` (**propuesta**; confirmar clave al importar catálogo RNM).

## `data_source_catalog` / `data_import_runs`

Trazabilidad ETL; `stats` JSON: `{ "rows_upserted", "duration_ms" }`.

## Mapeo UI español ↔ API

| UI | API `report_status` |
|----|---------------------|
| Recibido | `received` |
| En revisión | `under_review` |
| Validado | `validated` |
| En atención | `in_progress` |
| Resuelto | `resolved` |
| Rechazado | `rejected` |