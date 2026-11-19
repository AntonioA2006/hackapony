# Interfaz ciudadana

## Página principal

- Hero: problema + CTA "Ver mapa" / "Reportar".
- Indicadores públicos agregados (incidencias activas en área visible) sin PII.

## Mapa público

- Capa OSM + marcadores/cluster incidencias.
- Filtros: categoría, estado, urgencia (rango).
- Panel detalle: folio público, conteos, botón **Confirmar** (login requerido).
- Sin nombre/email/fotos de reportantes.

## Formulario reporte (pasos)

1. Categoría y título  
2. Descripción y gravedad  
3. Ubicación (GPS / pin) + referencia textual  
4. Fotos (preview, eliminar)  
5. Resumen + envío  

**Pre-envío:** modal si `nearby_suggestions` no vacío.

## Confirmación reporte

- Folio grande `public_id`.
- Enlace a "Mis reportes".

## Mis reportes

- Tabla/cards: folio, fecha, estado chip, mini mapa.
- Detalle: timeline historial, fotos propias, incidencia vinculada.

## Consulta estado

Timeline con estados en español (ver data dictionary mapping).

## Dashboard ciudadano

Widgets: totales, pendientes, en atención, resueltos; lista actividad reciente; FAB reportar.

## Mobile

- Botón flotante reportar.
- Input file con cámara `capture=environment`.
- Permisos geolocalización explicados antes del prompt.