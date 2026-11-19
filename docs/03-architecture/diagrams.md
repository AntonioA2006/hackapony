# Diagramas de arquitectura

## Contenedor (C4 simplificado)

```mermaid
flowchart TB
  subgraph web [Navegador]
    SPA[React SPA]
  end
  subgraph srv [Servidor aplicación]
    API[FastAPI Monolito]
  end
  subgraph data [Datos]
    PG[(PostgreSQL)]
    VOL[Volúmenes fotos]
  end
  SPA -->|REST JSON| API
  API --> PG
  API --> VOL
```

## Modelo de dominio (conceptual)

```mermaid
erDiagram
  USERS ||--o{ REPORTS : creates
  USERS ||--o{ CITIZEN_CONFIRMATIONS : confirms
  USERS ||--o{ NOTIFICATIONS : receives
  REPORTS ||--o{ REPORT_PHOTOS : has
  REPORTS }o--|| INCIDENTS : grouped_in
  INCIDENTS ||--o{ INCIDENT_HISTORY : audits
  MUNICIPALITIES ||--o{ CENSUS_AREAS : contains
  CENSUS_AREAS ||--o{ REPORTS : spatial_context
  INEGI_INDICATORS }o--|| MUNICIPALITIES : references
```

Diagrama físico tablas: [../04-database/entity-relationship.md](../04-database/entity-relationship.md).

## Estados — reporte

```mermaid
stateDiagram-v2
  [*] --> received
  received --> under_review
  under_review --> validated
  under_review --> rejected
  validated --> in_progress
  in_progress --> resolved
  rejected --> [*]
  resolved --> [*]
```

## Estados — incidencia (operativa)

`open` → `triaged` → `in_progress` → `resolved` | `dismissed` (sincronización parcial con reportes documentada en servicio).

## Despliegue MVP

```mermaid
flowchart LR
  DC[Docker Compose]
  DC --> C1[frontend nginx]
  DC --> C2[api uvicorn]
  DC --> C3[postgis]
  C2 --> C3
```

Detalle infra: [../11-infrastructure/docker-architecture.md](../11-infrastructure/docker-architecture.md).