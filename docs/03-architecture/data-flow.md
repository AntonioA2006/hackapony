# Flujos de datos

## Registro de reporte

```mermaid
sequenceDiagram
  participant U as Ciudadano
  participant FE as Frontend
  participant API as FastAPI
  participant DB as PostGIS
  participant FS as Almacén fotos

  U->>FE: Completa formulario + fotos
  FE->>API: GET reports/nearby (opcional)
  API->>DB: ST_DWithin candidatos
  FE->>API: POST /reports (multipart/JSON + URLs fotos)
  API->>DB: INSERT reports
  API->>FS: Guardar archivos
  API->>API: grouping_service
  API->>DB: upsert incidents + links
  API->>API: priority_service
  API->>DB: UPDATE urgency_score
  API->>DB: INSERT notifications
  API-->>FE: 201 + folio
```

## Agrupamiento

Entrada: nuevo `report` con `location` y categoría elegible.  
Pasos:

1. Buscar incidencias abiertas en radio `GROUPING_DISTANCE_M` (default 75).
2. Si hay match, asignar `incident_id`; si no, crear incidencia con centroide inicial.
3. Recalcular `report_count`, `confirmation_count` en incidencia.

## Priorización

Disparada tras cambios en gravedad, conteos o tiempo. Servicio invoca `compute_urgency()` — ver [../07-business-logic/incident-prioritization.md](../07-business-logic/incident-prioritization.md).

## Importación INEGI

```mermaid
flowchart TD
  A[Trigger manual/cron] --> B[Descarga o API wscatgeo]
  B --> C[GeoPandas read]
  C --> D[Validar SRID / reproyectar 4326]
  D --> E[Limpiar claves CVEGEO]
  E --> F[Upsert municipalities / census_areas]
  F --> G[Registrar data_import_runs]
  G --> H[Post-hook: relink reports sin AGEB]
```

## Fotografías

1. Cliente sube a `POST /reports/{id}/photos`.
2. API valida MIME/tamaño, genera nombre opaco (UUID), guarda metadata en `report_photos`.
3. Descarga admin vía endpoint autenticado; público no accede a EXIF/PII.

## Mapa público

Solo campos whitelisted en DTO `PublicIncident`: id, categoría, estado agregado, urgencia, coordenadas, conteos — sin `user_id`.