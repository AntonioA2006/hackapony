# Criterios de aceptación verificables

Estados: **Especificado** (pre-implementación).

## Autenticación

| ID | Criterio | Verificación |
|----|----------|--------------|
| AC-AUTH-01 | Ciudadano puede registrarse | Test e2e: POST register → 201, usuario en `users` |
| AC-AUTH-02 | Ciudadano puede iniciar sesión | POST login → tokens; GET `/users/me` → 200 |
| AC-AUTH-03 | Contraseña no se almacena en claro | Inspección DB + unit test hash |

## Reportes

| ID | Criterio | Verificación |
|----|----------|--------------|
| AC-REP-01 | Crear reporte autenticado | POST report → 201; fila en `reports` |
| AC-REP-02 | Coordenadas PostGIS | `ST_AsText(location)` coincide con envío (SRID 4326) |
| AC-REP-03 | Mis reportes solo propios | GET `/users/me/reports` no lista ajenos |
| AC-REP-04 | Fotos seguras | POST photos; archivo fuera de webroot; URL firmada o ruta protegida |
| AC-REP-05 | Folio único | UUID/`public_id` único en constraint |

## Público y privacidad

| ID | Criterio | Verificación |
|----|----------|--------------|
| AC-PRIV-01 | Mapa público sin PII | Respuesta `incidents/public` sin email/nombre reportante |
| AC-CONF-01 | Confirmación única | Segundo POST confirm → 409 |

## Duplicados y agrupamiento

| ID | Criterio | Verificación |
|----|----------|--------------|
| AC-DUP-01 | Sugerencia pre-envío | Mock dos reportes a 30 m → UI/API nearby devuelve candidato |
| AC-GRP-01 | Agrupamiento | Tres reportes < 75 m → una incidencia, tres FK |

## Administración

| ID | Criterio | Verificación |
|----|----------|--------------|
| AC-ADM-01 | Admin valida reporte | PATCH estado; entrada en `incident_history` |
| AC-ADM-02 | Rechazo con motivo | `rejected` exige `rejection_reason` |

## Priorización

| ID | Criterio | Verificación |
|----|----------|--------------|
| AC-PRIO-01 | Score determinista | Misma entrada → mismo score; suite pytest golden files |

## Notificaciones

| ID | Criterio | Verificación |
|----|----------|--------------|
| AC-NOT-01 | Notificación in-app | Tras cambio estado → fila en `notifications` visible en GET me/notifications |

## Historial

| ID | Criterio | Verificación |
|----|----------|--------------|
| AC-HIST-01 | Trazabilidad | GET `/reports/{id}/history` ordenado por `created_at` |

## Dashboard ciudadano

| ID | Criterio | Verificación |
|----|----------|--------------|
| AC-DASH-C-01 | Contadores | Coinciden con agregación SQL del usuario |

Suite de pruebas: [../10-testing/test-cases.md](../10-testing/test-cases.md).