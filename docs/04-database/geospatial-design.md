# Diseño geoespacial

## Sistema de referencia

- **Almacenamiento:** `geography(Point,4326)` para distancias métricas con `ST_DWithin`.
- **Alternativa válida:** `geometry(Point,4326)` + transformación a 3857 para distancia; geography preferida por simplicidad MVP.

## Índices espaciales

```sql
CREATE INDEX reports_location_gix ON reports USING GIST (location);
CREATE INDEX incidents_centroid_gix ON incidents USING GIST (centroid);
CREATE INDEX incidents_public_location_gix ON incidents USING GIST (public_location);
CREATE INDEX census_areas_geom_gix ON census_areas USING GIST (geom);
CREATE INDEX municipalities_geom_gix ON municipalities USING GIST (geom);
```

## Consultas canónicas

### Reportes cercanos (radio en metros)

```sql
SELECT id, public_id, ST_Distance(location, ST_MakePoint(:lon, :lat)::geography) AS dist_m
FROM reports
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
  :radius_m
)
AND status NOT IN ('rejected')
ORDER BY dist_m
LIMIT :limit;
```

### Incidencias públicas en bbox

```sql
SELECT i.id, i.public_id, i.urgency_score, i.priority_band,
       ST_Y(i.public_location::geometry) AS lat,
       ST_X(i.public_location::geometry) AS lon
FROM incidents i
WHERE i.status NOT IN ('dismissed', 'resolved')
  AND i.public_location && ST_MakeEnvelope(:xmin, :ymin, :xmax, :ymax, 4326)::geography
ORDER BY i.urgency_score DESC
LIMIT 200;
```

El `&&` va sobre `public_location` (no sobre el centroide) para que el índice GiST aplique y para que encoger el bbox no revele el punto real. Ver ADR-016.

### Asignación AGEB

```sql
SELECT ca.id
FROM census_areas ca
WHERE ST_Intersects(ca.geom::geometry, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
ORDER BY ST_Area(ST_Intersection(ca.geom::geometry, ST_Buffer(ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), 0.00001))) DESC
LIMIT 1;
```

## Parámetros de negocio (configurables)

| Parámetro | Default MVP | Uso |
|-----------|-------------|-----|
| `DUPLICATE_SUGGEST_RADIUS_M` | 50 | Pre-envío UI |
| `GROUPING_DISTANCE_M` | 75 | Agrupar incidencia |
| `NEARBY_PUBLIC_RADIUS_M` | 500 | Mapa ciudadano |

## Importación geometrías INEGI

1. Descarga GeoJSON/shapefile Marco Geoestadístico (**verificar** ficha oficial vigente).
2. GeoPandas: `to_crs(4326)`.
3. Validar `make_valid` si self-intersections.
4. Bulk insert con `COPY` o `ST_GeomFromGeoJSON`.

## Limitaciones

- Precisión GPS móvil puede superar radio de agrupamiento; admin puede fusionar manualmente.
- AGEB en límites puede asignar zona censal incorrecta puntualmente.

Población estimada: [../07-business-logic/population-impact-estimation.md](../07-business-logic/population-impact-estimation.md).