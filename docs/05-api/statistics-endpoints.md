# Endpoints — Estadísticas

Rol mínimo: `ADMINISTRADOR` (salvo contadores agregados anónimos futuros).

## GET `/statistics/summary`

KPIs: incidencias abiertas, reportes últimas 24h/7d, media urgencia, confirmaciones.

```json
{
  "open_incidents": 42,
  "reports_last_7d": 128,
  "avg_urgency_open": 54.2,
  "confirmations_last_7d": 89
}
```

## GET `/statistics/incidents-by-municipality`

Query: `from`, `to`. Agrupa por `municipalities.cvegeo`.

## GET `/statistics/incidents-by-state`

Agrupa por `cve_ent`.

## GET `/statistics/incidents-by-severity`

Usa `leak_severity` agregada por incidencia.

## GET `/statistics/geographic-distribution`

Grid o hex binning (implementación: celdas sobre bbox). Respuesta GeoJSON FeatureCollection **propuesta**.

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-99.13, 19.43] },
      "properties": { "count": 7 }
    }
  ]
}
```

## GET `/statistics/citizen-dashboard`

Rol `CIUDADANO`. Contadores personales (equivalente a agregación de `/users/me/reports`).