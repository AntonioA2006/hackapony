# Diagrama entidad-relación

## Mermaid ER (tablas físicas)

```mermaid
erDiagram
  users {
    uuid id PK
    varchar email UK
    varchar password_hash
    varchar display_name
    user_role role
    timestamptz created_at
  }
  reports {
    uuid id PK
    varchar public_id UK
    uuid user_id FK
    uuid incident_id FK
    varchar title
    text description
    report_category category
    leak_severity severity
    geography location
    varchar address_reference
    report_status status
    text rejection_reason
    uuid municipality_id FK
    uuid census_area_id FK
    timestamptz reported_at
    timestamptz created_at
  }
  incidents {
    uuid id PK
    varchar public_id UK
    incident_status status
    report_category primary_category
    geography centroid
    int report_count
    int confirmation_count
    numeric urgency_score
    priority_band priority_band
    uuid municipality_id FK
    uuid census_area_id FK
    timestamptz opened_at
    timestamptz updated_at
  }
  report_photos {
    uuid id PK
    uuid report_id FK
    varchar storage_key
    varchar mime_type
    int size_bytes
    timestamptz created_at
  }
  citizen_confirmations {
    uuid id PK
    uuid incident_id FK
    uuid user_id FK
    timestamptz created_at
  }
  incident_history {
    uuid id PK
    uuid incident_id FK
    uuid actor_user_id FK
    varchar event_type
    jsonb payload
    timestamptz created_at
  }
  notifications {
    uuid id PK
    uuid user_id FK
    varchar type
    varchar title
    text body
    jsonb metadata
    timestamptz read_at
    timestamptz created_at
  }
  municipalities {
    uuid id PK
    char cve_ent
    char cve_mun
    varchar cvegeo UK
    varchar name
    geography geom
    int pob_total
  }
  census_areas {
    uuid id PK
    varchar cvegeo UK
    char cve_ent
    char cve_mun
    char cve_ageb
    varchar ambito
    geography geom
    int pob_total
    int viviendas_habitadas
  }
  inegi_indicators {
    uuid id PK
    uuid municipality_id FK
    varchar dataset_code
    varchar variable_code
    varchar variable_label
    numeric value
    varchar unit
    int reference_year
    uuid import_run_id FK
  }
  data_source_catalog {
    uuid id PK
    varchar source_key UK
    varchar official_name
    varchar institution
    text source_url
    timestamptz last_verified_at
  }
  data_import_runs {
    uuid id PK
    uuid source_id FK
    varchar status
    timestamptz started_at
    timestamptz finished_at
    jsonb stats
    text error_message
  }

  users ||--o{ reports : "user_id"
  users ||--o{ citizen_confirmations : "user_id"
  users ||--o{ notifications : "user_id"
  incidents ||--o{ reports : "incident_id"
  reports ||--o{ report_photos : "report_id"
  incidents ||--o{ incident_history : "incident_id"
  incidents ||--o{ citizen_confirmations : "incident_id"
  municipalities ||--o{ census_areas : "municipality_id"
  municipalities ||--o{ reports : "municipality_id"
  municipalities ||--o{ incidents : "municipality_id"
  census_areas ||--o{ reports : "census_area_id"
  data_source_catalog ||--o{ data_import_runs : "source_id"
  data_import_runs ||--o{ inegi_indicators : "import_run_id"
```

## Tablas adicionales justificadas

| Tabla | Motivo |
|-------|--------|
| `citizen_confirmations` | Corroboración sin duplicar reportes |
| `notifications` | MVP in-app |
| `data_source_catalog` / `data_import_runs` | Trazabilidad INEGI |
| `users.role` enum | RBAC tres roles |

## Eliminaciones respecto al listado inicial

No se crea tabla separada `roles`; el rol vive en `users.role` (MVP simple). Escalar a `roles`/`user_roles` si aparecen permisos granulares.

Diccionario: [data-dictionary.md](./data-dictionary.md).