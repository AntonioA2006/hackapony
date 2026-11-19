# Roadmap de desarrollo

## Fase 1 — Configuración y arquitectura base

| | |
|--|--|
| **Objetivo** | Repositorio ejecutable vacío con CI y contenedores |
| **Tareas** | Estructura backend/frontend, Docker Compose, linters, `.env.example` |
| **Dependencias** | Ninguna |
| **Entregables** | Build local `docker compose up` |
| **Criterios** | Health API y PostGIS activo |
| **Riesgos** | Incompatibilidad GeoPandas en imagen |

## Fase 2 — Base de datos y backend núcleo

| | |
|--|--|
| **Objetivo** | Modelo PostGIS + auth JWT |
| **Tareas** | Alembic 001, users, refresh tokens, `/auth/*`, `/users/me` |
| **Dependencias** | Fase 1 |
| **Entregables** | Migraciones + tests auth |
| **Criterios** | AC-AUTH-01/02 |

## Fase 3 — Registro ciudadano

| | |
|--|--|
| **Objetivo** | CRUD reportes, fotos, mis reportes |
| **Tareas** | `reports`, `report_photos`, notificaciones básicas |
| **Criterios** | AC-REP-01..05, AC-NOT-01 parcial |

## Fase 4 — Mapa interactivo

| | |
|--|--|
| **Objetivo** | SPA mapa OSM, formulario ubicación |
| **Tareas** | Leaflet, público mock hasta Fase 5 |

## Fase 5 — Agrupamiento geográfico

| | |
|--|--|
| **Objetivo** | Incidents + grouping + nearby |
| **Criterios** | AC-GRP-01, AC-DUP-01 |

## Fase 6 — Algoritmo de priorización

| | |
|--|--|
| **Objetivo** | `priority_service` + desglose admin |
| **Criterios** | AC-PRIO-01 |

## Fase 7 — Dashboard administrativo

| | |
|--|--|
| **Objetivo** | Validación, estados, cola urgencia |
| **Criterios** | AC-ADM-01/02 |

## Fase 8 — Integración INEGI

| | |
|--|--|
| **Objetivo** | Import wscatgeo + CNGMD piloto |
| **Criterios** | FR-DAT-001..005 |
| **Riesgos** | Cambio formato RNM |

## Fase 9 — Testing y despliegue

| | |
|--|--|
| **Objetivo** | CI completa, staging |
| **Criterios** | Cobertura quality standards |

## Post-MVP

- Email/push, CAPTCHA, S3 fotos, CONAGUA capas, jitter mapa público.

Tareas detalladas: [development-tasks.md](./development-tasks.md).