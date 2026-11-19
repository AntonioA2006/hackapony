# Detección de duplicados y cercanía

## Objetivos

1. **Pre-envío:** sugerir incidencia existente (UX).
2. **Post-envío:** vincular al mismo grupo espacial.
3. **Integridad:** no fusionar reportes de distintos usuarios en un solo registro.

## Reglas

| Regla | Valor default |
|-------|---------------|
| Radio sugerencia (`DUPLICATE_SUGGEST_RADIUS_M`) | 50 m |
| Radio agrupamiento (`GROUPING_DISTANCE_M`) | 75 m |
| Ventana temporal sugerencia | 72 h (propuesta) |
| Mismo usuario, misma ubicación < 24 h | 409 o advertencia fuerte |

## Algoritmo sugerencia (pre-envío)

```text
INPUT: lat, lon, category
CANDIDATES = incidents WHERE ST_DWithin(centroid, point, 50m)
  AND status NOT IN (resolved, dismissed)
  AND primary_category compatible(category)
RETURN sorted by distance LIMIT 5
```

UI: "¿Es la misma incidencia?" → Confirmar o Crear nuevo.

## Duplicado mismo autor

Si `ST_DWithin` < 10 m y Δt < 1 h y mismo título similar (Levenshtein opcional post-MVP), rechazar con 409 `DUPLICATE_REPORT`.

## Post-envío

Servicio agrupamiento elige incidencia más cercana dentro de 75 m o crea nueva si categoría elegible — ver [incident-management.md](./incident-management.md).

## Conservación

Nunca DELETE report; rechazo administrativo mantiene registro.