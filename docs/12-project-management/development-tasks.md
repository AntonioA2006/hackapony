# Tareas de desarrollo (backlog inicial)

Formato: `[F{n}]` = fase roadmap.

## Infra y base

- [F1] Inicializar `backend` FastAPI con `app/main.py` y `/health`
- [F1] Inicializar `frontend` Vite React TS Tailwind
- [F1] Compose PostGIS 16-3.4
- [F2] Migración enums y `users`
- [F2] Implementar RBAC deps

## Ciudadano

- [F3] POST `/reports` + validación coordenadas
- [F3] POST photos multipart
- [F3] GET `/users/me/reports`, `/reports/{id}/history`
- [F3] Confirmaciones UI placeholder
- [F4] Página mapa público consume `/incidents/public`
- [F4] Flujo reporte 5 pasos
- [F4] Dashboard ciudadano

## Core negocio

- [F5] `grouping_service` + `incidents`
- [F5] GET nearby + sugerencias
- [F5] POST `/incidents/{id}/confirm`
- [F6] `compute_urgency` + tests golden
- [F6] Recalcular en eventos

## Admin

- [F7] Layout admin + guard rol
- [F7] Tabla incidencias filtros
- [F7] Detalle desglose S,C,I,T
- [F7] Validar/rechazar reportes

## Datos

- [F8] Catálogo fuentes + script wscatgeo por `cve_ent`
- [F8] Job asignación AGEB
- [F8] Import CSV CNGMD piloto (manual download)

## Calidad

- [F9] Pipeline pytest + vitest
- [F9] Documentar OpenAPI export
- [F9] Deploy staging