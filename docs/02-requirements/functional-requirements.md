# Requisitos funcionales

Identificador: `FR-{módulo}-{número}`. Estado: **especificación** (no implementado).

## RF-CIU — Módulo ciudadano

### Gestión de usuarios

| ID | Requisito |
|----|-----------|
| FR-CIU-001 | El sistema debe permitir registro con email, contraseña y aceptación de términos. |
| FR-CIU-002 | Inicio y cierre de sesión con tokens (ver API auth). |
| FR-CIU-003 | Recuperación de contraseña mediante flujo por email (MVP: diseño; puede posponer envío real). |
| FR-CIU-004 | Perfil: nombre para mostrar, email (lectura), preferencias básicas. |
| FR-CIU-005 | Sección **Mis reportes**: listado propio con filtros por estado. |
| FR-CIU-006 | Historial de cambios visible por reporte/incidencia asociada. |

### Creación de reportes

| ID | Requisito |
|----|-----------|
| FR-CIU-010 | Campos: título, descripción, categoría, tipo de fuga (si aplica), ubicación, referencia textual, fotos, timestamp servidor. |
| FR-CIU-011 | Ubicación vía GPS (con consentimiento) o selección en mapa Leaflet/OSM. |
| FR-CIU-012 | Folio/UUID único al crear reporte. |
| FR-CIU-013 | Múltiples fotografías por reporte (límite configurable). |
| FR-CIU-014 | Antes de enviar, si hay incidencia cercana, sugerir y ofrecer **confirmar** en lugar de duplicar. |

### Seguimiento y estados

Estados de reporte (canónicos):

`received` | `under_review` | `validated` | `in_progress` | `resolved` | `rejected`

| ID | Requisito |
|----|-----------|
| FR-CIU-020 | Mostrar estado actual y motivo si `rejected`. |
| FR-CIU-021 | Indicar si el reporte está agrupado en una incidencia. |
| FR-CIU-022 | Cada cambio de estado en incidencia se refleja en historial consultable. |

### Participación pública

| ID | Requisito |
|----|-----------|
| FR-CIU-030 | Mapa público de incidencias con filtros categoría/estado. |
| FR-CIU-031 | POST confirmación en incidencia: un usuario, una confirmación por incidencia. |
| FR-CIU-032 | Confirmación incrementa corroboración sin crear reporte nuevo. |

### Validación y abuso

| ID | Requisito |
|----|-----------|
| FR-CIU-040 | Validación MIME/tamaño de imágenes. |
| FR-CIU-041 | Rate limiting por usuario/IP en creación de reportes. |
| FR-CIU-042 | Detección de cercanía para duplicados (ver lógica de negocio). |
| FR-CIU-043 | Administrador valida o rechaza; no borrar reportes originales. |

### Notificaciones

| ID | Requisito |
|----|-----------|
| FR-CIU-050 | MVP: notificaciones in-app en eventos recibido, validado, rechazado, en atención, resuelto. |
| FR-CIU-051 | Diseño extensible a email/push sin romper contrato. |

### Dashboard ciudadano

| ID | Requisito |
|----|-----------|
| FR-CIU-060 | Contadores: total, pendientes, en atención, resueltos; actividad reciente; CTA nuevo reporte. |

## RF-ADM — Módulo administrativo

| ID | Requisito |
|----|-----------|
| FR-ADM-001 | Dashboard con KPIs de incidencias abiertas, por urgencia y municipio. |
| FR-ADM-002 | Mapa de incidencias con capas y filtros. |
| FR-ADM-003 | Lista paginada con filtros estado, gravedad, fecha, bbox. |
| FR-ADM-004 | Detalle: reportes agrupados, fotos, historial, urgencia desglosada. |
| FR-ADM-005 | Actualizar estado de incidencia y notas internas. |
| FR-ADM-006 | Agrupar/desagrupar reportes manualmente (con auditoría). |
| FR-ADM-007 | Estadísticas exportables (JSON/CSV en fase posterior). |

## RF-DAT — Datos oficiales

| ID | Requisito |
|----|-----------|
| FR-DAT-001 | Registrar metadatos de cada fuente importada. |
| FR-DAT-002 | Importar municipios y AGEB desde fuentes INEGI verificadas. |
| FR-DAT-003 | Vincular reporte/incidencia a municipio y AGEB por intersección espacial. |
| FR-DAT-004 | Consultar indicadores municipales almacenados (tabla `inegi_indicators`). |
| FR-DAT-005 | Exponer fecha de última actualización por fuente. |

## RF-GEO — Análisis geográfico

| ID | Requisito |
|----|-----------|
| FR-GEO-001 | Consulta de reportes/incidencias en radio (metros). |
| FR-GEO-002 | Agrupamiento automático bajo umbral de distancia. |
| FR-GEO-003 | Mapas de concentración (heatmap o grid) para admin. |
| FR-GEO-004 | Estimación población potencial en AGEB (ver limitaciones). |

Referencias: [../07-business-logic/](../07-business-logic/), [../08-frontend/citizen-interface.md](../08-frontend/citizen-interface.md).