# Dashboard administrativo

## Layout

- Sidebar: Dashboard, Mapa, Incidencias, Reportes, Estadísticas, Importación (superadmin).
- Topbar: usuario, logout.

## Dashboard general

- KPI cards: abiertas, críticas, reportes 24h.
- Gráfica barras por `priority_band`.
- Tabla top urgencias con enlace detalle.

## Mapa incidencias

- Mismas bases OSM; capas municipio/AGEB opcionales (WMS futuro).
- Click incidencia → drawer detalle.

## Tabla reportes

- Columnas: folio, categoría, estado, autor (admin), municipio, fecha.
- Acciones: validar, rechazar, abrir incidencia.

## Detalle incidencia

- Mapa centrado, lista reportes con fotos, desglose urgencia (S,C,I,T).
- Form cambio estado + notas.
- Historial auditoría.

## Estadísticas

- Filtros fecha/municipio.
- Gráficas por severidad y distribución geográfica.

## Gestión incidencias

- Cola priorizada desde `/incidents/priority`.
- Agrupar reportes drag-and-drop (propuesta UX post-MVP: multiselect).