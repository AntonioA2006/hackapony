# Estimación de población potencialmente expuesta

## Definición

Métrica **indicativa** para priorización: población total del **AGEB** donde cae el centroide de la incidencia, o fracción propuesta si se usa buffer.

## No es

- Conteo de personas afectadas por la fuga.
- Pérdida de servicio domiciliario modelada.
- Dato oficial de afectación.

## Método MVP

1. `ST_Intersects` centroide ↔ `census_areas.geom`.
2. Tomar `census_areas.pob_total` (fuente INEGI Marco Geoestadístico / wscatgeo metadatos).
3. Alimentar componente **I** del índice de urgencia (máx 20 pts).

## Extensiones futuras (propuesta)

| Método | Limitación |
|--------|------------|
| Buffer 100 m × densidad | Requiere supuesto uniforme |
| Viviendas habitadas | No equivale a personas expuestas al agua en calle |
| Nivel manzana INEGI | Mayor precisión; más carga ETL |

## Presentación UI

Etiqueta obligatoria: **"Población de referencia en zona censal (AGEB), no afectados confirmados."**

## Variables de entrada

- `census_area_id`
- `pob_total` (nullable si import pendiente)

## Si dato ausente

Mostrar "Sin dato censal" e I = 0 en urgencia.