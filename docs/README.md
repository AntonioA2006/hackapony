# Documentación técnica — Agua Alerta

Plataforma ciudadana para **detección, registro, análisis y priorización** de fugas y problemas de agua potable.

> **Estado del repositorio:** sin código de aplicación (solo `docs/`). Todo lo descrito es **especificación para desarrollo**, no funcionalidad implementada.

## Orden de lectura recomendado

1. [01-project/project-overview.md](./01-project/project-overview.md)
2. [01-project/objectives-and-scope.md](./01-project/objectives-and-scope.md)
3. [03-architecture/system-architecture.md](./03-architecture/system-architecture.md) → luego [reference-architecture.md](./03-architecture/reference-architecture.md)
4. [04-database/entity-relationship.md](./04-database/entity-relationship.md)
5. [05-api/api-overview.md](./05-api/api-overview.md)
6. [07-business-logic/incident-prioritization.md](./07-business-logic/incident-prioritization.md)
7. [06-data-sources/inegi-data-sources.md](./06-data-sources/inegi-data-sources.md)
8. [08-frontend/citizen-interface.md](./08-frontend/citizen-interface.md)
9. [09-security/security-architecture.md](./09-security/security-architecture.md)
10. [10-testing/testing-strategy.md](./10-testing/testing-strategy.md)
11. [12-project-management/development-roadmap.md](./12-project-management/development-roadmap.md)

## Índice por carpeta

### 01-project

| Documento | Estado |
|-----------|--------|
| [project-overview.md](./01-project/project-overview.md) | Completo |
| [problem-statement.md](./01-project/problem-statement.md) | Completo |
| [objectives-and-scope.md](./01-project/objectives-and-scope.md) | Completo |
| [stakeholders.md](./01-project/stakeholders.md) | Completo |

### 02-requirements

| Documento | Estado |
|-----------|--------|
| [functional-requirements.md](./02-requirements/functional-requirements.md) | Completo (incl. módulo ciudadano ampliado) |
| [non-functional-requirements.md](./02-requirements/non-functional-requirements.md) | Completo |
| [user-stories.md](./02-requirements/user-stories.md) | Completo |
| [use-cases.md](./02-requirements/use-cases.md) | Completo |
| [acceptance-criteria.md](./02-requirements/acceptance-criteria.md) | Completo |

### 03-architecture

| Documento | Estado |
|-----------|--------|
| [system-architecture.md](./03-architecture/system-architecture.md) | Completo |
| [reference-architecture.md](./03-architecture/reference-architecture.md) | Propuesta (revisión senior, hallazgos y ADR-011…018) |
| [architecture-decisions.md](./03-architecture/architecture-decisions.md) | Completo |
| [backend-architecture.md](./03-architecture/backend-architecture.md) | Completo |
| [frontend-architecture.md](./03-architecture/frontend-architecture.md) | Completo |
| [data-flow.md](./03-architecture/data-flow.md) | Completo |
| [diagrams.md](./03-architecture/diagrams.md) | Completo |

### 04-database

| Documento | Estado |
|-----------|--------|
| [database-design.md](./04-database/database-design.md) | Completo |
| [entity-relationship.md](./04-database/entity-relationship.md) | Completo |
| [data-dictionary.md](./04-database/data-dictionary.md) | Completo |
| [geospatial-design.md](./04-database/geospatial-design.md) | Completo |

### 05-api

| Documento | Estado |
|-----------|--------|
| [api-overview.md](./05-api/api-overview.md) | Completo |
| [authentication.md](./05-api/authentication.md) | Completo |
| [reports-endpoints.md](./05-api/reports-endpoints.md) | Completo |
| [incidents-endpoints.md](./05-api/incidents-endpoints.md) | Completo |
| [statistics-endpoints.md](./05-api/statistics-endpoints.md) | Completo |
| [error-handling.md](./05-api/error-handling.md) | Completo |

### 06-data-sources

| Documento | Estado |
|-----------|--------|
| [inegi-data-sources.md](./06-data-sources/inegi-data-sources.md) | Verificado parcial (ver notas internas) |
| [conagua-data-sources.md](./06-data-sources/conagua-data-sources.md) | Pendiente verificación URLs |
| [data-ingestion.md](./06-data-sources/data-ingestion.md) | Completo |
| [data-cleaning.md](./06-data-sources/data-cleaning.md) | Completo |
| [data-governance.md](./06-data-sources/data-governance.md) | Completo |

### 07-business-logic

| Documento | Estado |
|-----------|--------|
| [incident-management.md](./07-business-logic/incident-management.md) | Completo |
| [duplicate-detection.md](./07-business-logic/duplicate-detection.md) | Completo |
| [incident-prioritization.md](./07-business-logic/incident-prioritization.md) | Completo |
| [population-impact-estimation.md](./07-business-logic/population-impact-estimation.md) | Completo |

### 08-frontend

| Documento | Estado |
|-----------|--------|
| [ux-ui-specification.md](./08-frontend/ux-ui-specification.md) | Completo |
| [citizen-interface.md](./08-frontend/citizen-interface.md) | Completo |
| [admin-dashboard.md](./08-frontend/admin-dashboard.md) | Completo |
| [map-specification.md](./08-frontend/map-specification.md) | Completo |
| [design-system.md](./08-frontend/design-system.md) | Completo |

### 09-security

| Documento | Estado |
|-----------|--------|
| [security-architecture.md](./09-security/security-architecture.md) | Completo |
| [privacy.md](./09-security/privacy.md) | Completo |
| [threat-model.md](./09-security/threat-model.md) | Completo |

### 10-testing

| Documento | Estado |
|-----------|--------|
| [testing-strategy.md](./10-testing/testing-strategy.md) | Completo |
| [test-cases.md](./10-testing/test-cases.md) | Completo |
| [quality-standards.md](./10-testing/quality-standards.md) | Completo |

### 11-infrastructure

| Documento | Estado |
|-----------|--------|
| [docker-architecture.md](./11-infrastructure/docker-architecture.md) | Completo |
| [environment-variables.md](./11-infrastructure/environment-variables.md) | Completo |
| [deployment.md](./11-infrastructure/deployment.md) | Completo |
| [backup-and-recovery.md](./11-infrastructure/backup-and-recovery.md) | Completo |

### 12-project-management

| Documento | Estado |
|-----------|--------|
| [development-roadmap.md](./12-project-management/development-roadmap.md) | Completo |
| [development-tasks.md](./12-project-management/development-tasks.md) | Completo |
| [risks.md](./12-project-management/risks.md) | Completo |
| [definition-of-done.md](./12-project-management/definition-of-done.md) | Completo |

### 13-decisions

| Documento | Estado |
|-----------|--------|
| [adr-template.md](./13-decisions/adr-template.md) | Plantilla |
| [adr-001-monolito-modular.md](./13-decisions/adr-001-monolito-modular.md) | Aceptada |
| [adr-002-confirmaciones-ciudadanas.md](./13-decisions/adr-002-confirmaciones-ciudadanas.md) | Aceptada |

## Fuentes de verdad (evitar duplicar)

| Tema | Documento canónico |
|------|-------------------|
| Tablas y columnas | [04-database/data-dictionary.md](./04-database/data-dictionary.md) |
| Endpoints REST | [05-api/](./05-api/) |
| Urgencia 0–100 | [07-business-logic/incident-prioritization.md](./07-business-logic/incident-prioritization.md) |
| INEGI verificado | [06-data-sources/inegi-data-sources.md](./06-data-sources/inegi-data-sources.md) |
| Roles RBAC | [01-project/stakeholders.md](./01-project/stakeholders.md) |

## Decisiones pendientes

1. Visibilidad en mapa público: ¿solo incidencias con reporte **validado** o también en revisión? (ver [risks.md](./12-project-management/risks.md))
2. Recuperación de contraseña: ¿dentro del MVP o release siguiente?
3. Municipio/estado piloto para carga inicial INEGI.
4. Archivo ZIP exacto vigente del Marco Geoestadístico en ficha biblioteca INEGI.
5. Catálogo y automatización de descargas CONAGUA (verificación manual pendiente).

## Limitaciones conocidas

- Estimación de población usa AGEB; **no** mide afectación real por fuga.
- Pesos de urgencia son heurísticos, no calibrados con datos operativos.
- CONAGUA no verificado automáticamente en esta documentación.
- Sin evidencia de API oficial de fugas gubernamentales en tiempo real.
- Datos de ejemplo en SQL/API son **ficticios** (`@ejemplo.test`).

## Convenciones API

- Prefijo: `/api/v1`
- Roles: `CIUDADANO`, `ADMINISTRADOR`, `SUPERADMINISTRADOR`
- Geometría: WGS84 (EPSG:4326)

## Mantenimiento de la documentación

Al cambiar esquema, endpoints o algoritmo, actualizar el documento canónico y enlaces desde este README.