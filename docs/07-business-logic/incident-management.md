# Gestión de incidencias

## Ciclo de vida

### Reporte

Estados: `received` → `under_review` → `validated` | `rejected` → `in_progress` → `resolved`.

Rechazo exige `rejection_reason`.

### Incidencia

`open` → `triaged` → `in_progress` → `resolved` | `dismissed`.

## Creación automática

Condición: categoría ∈ `{leak_public_road, broken_pipe, public_infra_leak, flood_from_leak}` **y** (sin incidencia cercana **o** admin promueve).

`supply_issue` / `other_water`: incidencia solo tras revisión admin (`under_review`).

## Agrupamiento

Al asociar reporte:

1. Actualizar `incidents.report_count`.
2. Recalcular centroide (media aritmética lon/lat de reportes activos).
3. Reasignar `census_area_id` por centroide.
4. Invocar `compute_urgency`.
5. `incident_history`: `report_linked`.

## Agrupamiento manual (admin)

`POST /incidents/{id}/group-reports` — permite corregir errores GPS.

## Validación administrativa

| Acción | Efecto |
|--------|--------|
| Validar | `validated`; puede abrir incidencia |
| Rechazar | `rejected` + motivo; notificación ciudadano |
| En atención | sincroniza reportes vinculados a `in_progress` (configurable) |

## Historial

Todo cambio de estado en `incident_history` con `actor_user_id`, `payload`.

## Mapa público

Solo incidencias con al menos un reporte `validated` o policy `open` tras recibir primer reporte (**decisión pendiente**: restringir a validadas para reducir fraude — recomendación MVP: mostrar tras `under_review` con badge "sin validar").