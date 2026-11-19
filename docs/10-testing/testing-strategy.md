# Estrategia de pruebas

## Pirámide

| Nivel | Herramienta | % esfuerzo MVP |
|-------|-------------|----------------|
| Unitario dominio | pytest | Alto |
| Integración DB/API | pytest + TestClient + PostGIS testcontainer | Medio |
| Componentes UI | Vitest + RTL | Medio |
| E2E | Playwright (propuesta fase 9) | Bajo inicial |

## Backend (pytest)

- `domain/priority.py`: golden vectors urgencia.
- `grouping_service`: fixtures puntos conocidos.
- Espacial: migrar DB test, insert geometries, assert `ST_DWithin`.
- API: auth, reports, confirm 409.

## Frontend (Vitest + RTL)

- Formulario reporte validación campos.
- Mock fetch nearby suggestions.
- Mapa: smoke render con leaflet mock.

## Integración

1. Registro → login → POST report → aparece en me/reports.
2. Tres reportes cercanos → un incident.
3. Admin PATCH resolved → notificación.

## CI (propuesta)

GitHub Actions: lint, pytest, vitest, build docker.

Criterios: [quality-standards.md](./quality-standards.md), casos: [test-cases.md](./test-cases.md).