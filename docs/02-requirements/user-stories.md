# Historias de usuario

Formato: **Como** [rol] **quiero** [acción] **para** [beneficio].

## Ciudadano

| ID | Historia | Criterios vinculados |
|----|----------|----------------------|
| US-C-01 | Como ciudadano quiero registrarme para poder reportar fugas | AC-AUTH-01 |
| US-C-02 | Como ciudadano quiero iniciar sesión para acceder a mis reportes | AC-AUTH-02 |
| US-C-03 | Como ciudadano quiero crear un reporte con foto y ubicación | AC-REP-01, AC-REP-02 |
| US-C-04 | Como ciudadano quiero que el sistema me avise si ya existe una incidencia cercana | AC-DUP-01 |
| US-C-05 | Como ciudadano quiero confirmar una incidencia pública sin crear duplicado | AC-CONF-01 |
| US-C-06 | Como ciudadano quiero ver mis reportes y su estado | AC-REP-03 |
| US-C-07 | Como ciudadano quiero recibir notificaciones in-app de cambios | AC-NOT-01 |
| US-C-08 | Como ciudadano quiero ver un mapa público sin datos personales de otros | AC-PRIV-01 |
| US-C-09 | Como ciudadano quiero un dashboard con resumen de mi actividad | AC-DASH-C-01 |

## Administrador

| ID | Historia |
|----|----------|
| US-A-01 | Como administrador quiero listar incidencias por urgencia para priorizar brigadas |
| US-A-02 | Como administrador quiero validar o rechazar reportes con motivo |
| US-A-03 | Como administrador quiero agrupar reportes manualmente |
| US-A-04 | Como administrador quiero ver estadísticas por municipio |
| US-A-05 | Como administrador quiero consultar el desglose del índice de urgencia |

## Superadministrador

| ID | Historia |
|----|----------|
| US-S-01 | Como superadministrador quiero asignar rol administrador |
| US-S-02 | Como superadministrador quiero ejecutar importación INEGI y ver metadatos |
| US-S-03 | Como superadministrador quiero ajustar umbrales de agrupamiento y priorización |

Detalle de aceptación: [acceptance-criteria.md](./acceptance-criteria.md).