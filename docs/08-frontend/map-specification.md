# Especificación del mapa (Leaflet + OSM)

## Librerías

- `leaflet`, `react-leaflet`
- Cluster: `react-leaflet-cluster` (dependencia adicional propuesta)

## Capas

| Capa | Fuente | Visible |
|------|--------|---------|
| Base | OSM tiles | Todos |
| Incidencias públicas | API `incidents/public` | Ciudadano |
| Incidencias admin | API `incidents` | Admin |
| Pin edición | Local state | Formulario reporte |

## Atribución

Texto OSM © contribuidores visible según licencia ODbL.

## Interacciones

- Click pin → popup con folio, categoría, estado, urgencia.
- Doble click mapa en modo edición → mueve pin.
- Bbox fetch al mover mapa (debounce 300 ms, petición anterior cancelada). El cliente recorta el viewport a la zona de operación antes de llamar a `GET /incidents/public?bbox=…&page_size=200`. Los marcadores usan la coordenada ofuscada (~30 m).

## Iconografía

- Color por `priority_band` (crítica rojo, alta naranja, media amarillo, baja azul gris).

## Rendimiento

- Limitar features en viewport; paginar si > 500 markers → forzar cluster.

## Accesibilidad

- Lista alternativa textual de incidencias en panel lateral (no solo mapa).