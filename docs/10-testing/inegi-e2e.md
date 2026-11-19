# Prueba E2E INEGI (wscatgeo)

## Objetivo

Validar el flujo **municipios → AGEB → relink → contexto territorial → priorización** con datos oficiales INEGI (sin inventar geometrías).

## Piloto recomendado

| Paso | Acción |
|------|--------|
| Entidad | `09` (Ciudad de México) |
| Municipio AGEB | `002` (muestra acotada) |
| Coordenada prueba | `19.4326, -99.1332` (centro CDMX) |

## Script automatizado (anfitrión)

Con Docker en `:3080`:

```powershell
.\scripts\inegi-e2e.ps1
# API directa:
.\scripts\inegi-e2e.ps1 -BaseUrl "http://localhost:8000/api/v1"
```

Superadmin: `super@example.com` / `Super12345!` (seed).

## Panel admin (manual)

1. Iniciar sesión como **SUPERADMINISTRADOR**
2. **Paso 1:** import municipios `09`
3. **Paso 2:** import AGEB `09` / `002`
4. **Paso 3:** relink territorial
5. Crear o validar reporte en CDMX; revisar cola de prioridad

## Pytest (CI opcional / local)

```bash
cd backend
RUN_INGEI_E2E=1 RUN_DB_TESTS=1 pytest tests/test_inegi_e2e.py -v
```

Requiere salida a `https://gaia.inegi.org.mx`. Timeout hasta 10 min en import AGEB.

## Criterios de éxito

- `rows_upserted > 0` en municipios y AGEB
- Tras relink, incidencia/reporte en CDMX con `municipality_id` (y preferible `census_area_id`)
- `urgency_score` recalculado tras relink (usa `pob_total` AGEB cuando hay `census_area_id`)

## Fallos frecuentes

| Síntoma | Causa |
|---------|--------|
| 502 en import | INEGI caído o firewall sin salida |
| municipality_id null | Falta import municipios o punto fuera de geometría |
| urgency sin cambio | Sin AGEB intersectada; importar `09/002` y relink |

Fuentes: [inegi-data-sources.md](../06-data-sources/inegi-data-sources.md)