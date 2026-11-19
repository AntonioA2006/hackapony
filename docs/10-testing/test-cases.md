# Casos de prueba (muestra)

## TC-PRI-001 Golden urgencia alta

| Campo | Valor |
|-------|-------|
| severity | high |
| report_count | 3 |
| confirmation_count | 4 |
| pob_total | 2500 |
| hours_open | 36 |
| Esperado U | ≈ 66.2 ± 0.1 |
| band | high |

## TC-GEO-001 Nearby 50m

Dos reportes a 30 m → segundo devuelve suggestion con `incident_id`.

## TC-CONF-001

POST confirm dos veces → 409.

## TC-PRIV-001

GET incidents/public sin campos `email`, `display_name`.

## TC-ADM-001

Reject sin `rejection_reason` → 422.

## TC-PHOTO-001

Upload 6 MB → 413.

## TC-GRP-001

3 reportes 40 m en categoría fuga → `report_count`=3 una incidencia.

## TC-NOT-001

Cambio a resolved → notification type `incident_resolved` para autores vinculados.

Vincular a [../02-requirements/acceptance-criteria.md](../02-requirements/acceptance-criteria.md).