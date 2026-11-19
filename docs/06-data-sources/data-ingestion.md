# Estrategia de ingestión

## Principios

1. **Trazabilidad:** cada corrida en `data_import_runs`.
2. **Reproducibilidad:** scripts versionados en `backend/scripts/`.
3. **No inventar datos:** si falla descarga, abortar con error registrado.
4. **Idempotencia:** upsert por claves oficiales (`cvegeo`).

## Pipeline (batch)

```mermaid
flowchart LR
  S[Fuente INEGI] --> E[Extract]
  E --> V[Validate schema]
  V --> T[Transform CRS 4326]
  T --> L[Load upsert]
  L --> R[Relink spatial FKs]
```

## Fuentes y frecuencia propuesta

| Fuente | Método | Frecuencia | Rol |
|--------|--------|------------|-----|
| wscatgeo AGEB/municipios | HTTP GET paginado por `cve_ent` | Trimestral o al publicar marco | Actualizar geometrías/población AGEB |
| Marco Geoestadístico ZIP | Descarga manual/automatizada | Anual | Respaldo offline completo |
| CNGMD microdatos | Descarga RNM | Al publicar edición | `inegi_indicators` |

## Automatización

```text
# Propuesta comando (no implementado)
python -m scripts.import_inegi --source wscatgeo_ageb --cve-ent 09
python -m scripts.import_inegi --source cngmd_mod6 --file ./data/servagua_cngmd2023.csv
```

Throttling: pausa entre entidades; respetar capacidad del servicio público INEGI.

## Relación post-carga

1. `UPDATE reports SET census_area_id = …` para nulos.
2. Recalcular métricas de impacto territorial en incidencias afectadas.

Ver [data-cleaning.md](./data-cleaning.md).