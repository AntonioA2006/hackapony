# Diseño de base de datos

## Motor y extensiones

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()
```

## Tipos enumerados

```sql
CREATE TYPE user_role AS ENUM ('CIUDADANO', 'ADMINISTRADOR', 'SUPERADMINISTRADOR');

CREATE TYPE report_category AS ENUM (
  'leak_public_road', 'broken_pipe', 'public_infra_leak',
  'flood_from_leak', 'supply_issue', 'other_water'
);

CREATE TYPE leak_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE report_status AS ENUM (
  'received', 'under_review', 'validated', 'in_progress', 'resolved', 'rejected'
);

CREATE TYPE incident_status AS ENUM ('open', 'triaged', 'in_progress', 'resolved', 'dismissed');

CREATE TYPE priority_band AS ENUM ('critical', 'high', 'medium', 'low');
```

## Tabla `users`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, default `gen_random_uuid()` |
| email | VARCHAR(320) | NOT NULL UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| display_name | VARCHAR(120) | NOT NULL |
| role | user_role | NOT NULL DEFAULT 'CIUDADANO' |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL |

Índice: `users_email_lower_idx` ON `lower(email)`.

## Tabla `reports`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| location | geography(Point,4326) | NOT NULL |
| incident_id | UUID | FK `incidents`, NULL hasta agrupar |
| status | report_status | NOT NULL DEFAULT 'received' |
| rejection_reason | TEXT | CHECK: requerido si status=rejected |

Índices:

```sql
CREATE INDEX reports_location_gix ON reports USING GIST (location);
CREATE INDEX reports_user_created_idx ON reports (user_id, created_at DESC);
CREATE INDEX reports_incident_idx ON reports (incident_id);
```

## Tabla `incidents`

Centroide = promedio ponderado de reportes o primer reporte (documentar en servicio: **media de puntos** al recalcular).

```sql
CREATE INDEX incidents_centroid_gix ON incidents USING GIST (centroid);
CREATE INDEX incidents_public_location_gix ON incidents USING GIST (public_location);
CREATE INDEX incidents_urgency_idx ON incidents (urgency_score DESC, status);
```

## Tabla `citizen_confirmations`

```sql
ALTER TABLE citizen_confirmations
  ADD CONSTRAINT citizen_confirmations_unique UNIQUE (incident_id, user_id);
```

## Tabla `incident_history`

Eventos: `status_changed`, `report_linked`, `urgency_recalculated`, `manual_group`, `validation`.

`payload` JSONB con `{ "from", "to", "reason", "scores" }`.

## Relación espacial reporte → AGEB

Job/trigger post-insert:

```sql
UPDATE reports r
SET census_area_id = ca.id,
    municipality_id = m.id
FROM census_areas ca
JOIN municipalities m ON m.cve_ent = ca.cve_ent AND m.cve_mun = ca.cve_mun
WHERE r.id = :report_id
  AND ST_Intersects(ca.geom::geometry, r.location::geometry);
```

Si múltiples intersecciones (borde), elegir `ST_Area(ST_Intersection(...))` máximo.

## Estrategia de migraciones

- Alembic revision por release.
- Migración 001: extensiones + enums + tablas.
- Seed solo entornos `dev`/`test`.
- Nunca editar migraciones aplicadas en prod; forward-only.

## Datos de prueba (sintéticos)

| Entidad | Cantidad sugerida |
|---------|-------------------|
| users | 3 roles × 2 usuarios |
| municipalities | 1 municipio piloto real INEGI + geometría mínima |
| reports | 20 puntos aleatorios clusterizados |
| incidents | Generados por agrupamiento |

> Coordenadas de prueba deben etiquetarse como **sintéticas** en scripts; no presentarlas como fugas reales.

Ejemplos SQL adicionales: [geospatial-design.md](./geospatial-design.md).