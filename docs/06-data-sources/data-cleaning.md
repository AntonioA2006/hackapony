# Limpieza y normalización

## Geometrías

| Paso | Acción |
|------|--------|
| CRS | Convertir a EPSG:4326 si origen es México ITRF2008 / LLC |
| Validez | `ST_MakeValid` / Shapely `make_valid` |
| Tipo | `MultiPolygon` → mantener; puntos solo en localidades |
| Simplificación | No simplificar AGEB operativas (riesgo de bordes) |

## Claves geoestadísticas

- Normalizar `cve_ent` a 2 dígitos, `cve_mun` a 3, padding con ceros.
- `cvegeo` longitud 13 para AGEB según metadato wscatgeo (**verificado** en documentación servicio).

## Población y numéricos

- Cast `pob_total` a entero; NULL si texto vacío.
- Rechazar filas sin `cvegeo`.

## Indicadores CNGMD

- Mapear tabla origen → `variable_code` estable interno.
- Conservar `reference_year` del microdato.
- Documentar diccionario variable en metadatos import run.

## Calidad

| Regla | Acción |
|-------|--------|
| Duplicado `cvegeo` | Última corrida gana |
| Geometría vacía | Descartar + log |
| Municipio sin geometría | Bloquear publicación de capa |

## Almacenamiento

- Tablas `municipalities`, `census_areas`, `inegi_indicators`.
- Sin mezclar microdatos crudos con reportes ciudadanos (schemas lógicos separados en mismo DB).