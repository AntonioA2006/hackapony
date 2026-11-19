# Algoritmo de priorización (índice de urgencia)

Índice **U** ∈ [0, 100], determinista, sin ML.

## Componentes (pesos iniciales — no validados científicamente)

| Factor | Símbolo | Máximo pts |
|--------|---------|------------|
| Gravedad de fuga | S | 40 |
| Corroboración y concentración | C | 30 |
| Impacto territorial estimado | I | 20 |
| Tiempo sin atención | T | 10 |

\[
U = \min(100,\; S + C + I + T)
\]

## 1. Gravedad (S, máx 40)

Entrada: `severity` agregada de incidencia (`low`→`critical`).

| severity | Puntos |
|----------|--------|
| low | 10 |
| medium | 22 |
| high | 32 |
| critical | 40 |

Si reportes difieren, usar **máximo** declarado; admin puede fijar override.

## 2. Corroboración y concentración (C, máx 30)

Variables:

- `r` = `report_count`
- `k` = `confirmation_count`

\[
C = \min\left(30,\; 15 \cdot \frac{\min(r,5)}{5} + 15 \cdot \frac{\min(k,10)}{10}\right)
\]

Interpretación: hasta 15 pts por hasta 5 reportes, hasta 15 pts por hasta 10 confirmaciones.

## 3. Impacto territorial estimado (I, máx 20)

Usa `pob_total` del AGEB (`census_areas.pob_total`) asociado al centroide.

\[
I = \begin{cases}
0 & \text{si } pob\_total \text{ es NULL} \\
\min\left(20,\; 20 \cdot \frac{\log(1 + pob\_total)}{\log(1 + P_{ref})}\right) & \text{en otro caso}
\end{cases}
\]

`P_ref` = 5000 (constant config, calibrable). **No** implica personas afectadas.

## 4. Tiempo sin atención (T, máx 10)

`hours_open` desde `opened_at` hasta `now()` (o hasta resolución si cerrada).

\[
T = \min\left(10,\; 10 \cdot \frac{\min(hours\_open, 168)}{168}\right)
\]

168 h = 7 días saturación.

## 5. Información faltante

| Falta | Tratamiento |
|-------|-------------|
| `pob_total` | I = 0 |
| `severity` | default `medium` (22 pts) |
| Sin confirmaciones | parte k = 0 |
| Incidencia resuelta | U congelado al cerrar (opcional recalc=0) |

## 6. Bandas de prioridad

| Banda | Rango U |
|-------|---------|
| Crítica | ≥ 80 |
| Alta | 60–79.99 |
| Media | 35–59.99 |
| Baja | < 35 |

## 7. Ejemplo numérico

- severity `high` → S = 32  
- r = 3 → 15×3/5 = 9; k = 4 → 15×4/10 = 6 → C = 15  
- pob_total = 2500, P_ref=5000 → I ≈ 20×log(2501)/log(5001) ≈ 17.1  
- hours_open = 36 → T = 10×36/168 ≈ 2.1  

**U ≈ 32 + 15 + 17.1 + 2.1 = 66.2** → **Alta**

## 8. Pseudocódigo

```text
function compute_urgency(incident, census_area, now):
    S = severity_points(incident.severity)
    C = corroboration_points(incident.report_count, incident.confirmation_count)
    pob = census_area.pob_total if census_area else None
    I = territorial_points(pob, P_ref=5000)
    if incident.status in (resolved, dismissed):
        hours = hours_between(incident.opened_at, incident.updated_at)
    else:
        hours = hours_between(incident.opened_at, now)
    T = time_open_points(hours, cap_hours=168)
    U = min(100, S + C + I + T)
    band = band_from_score(U)
    return (round(U, 2), band)
```

## 9. Casos límite

| Caso | Comportamiento |
|------|----------------|
| Un solo reporte sin confirmaciones | C bajo; puede ser Media/Baja |
| Spam muchos reportes mismo usuario | **Propuesta:** cap `r` efectivo excluyendo duplicados mismo user |
| Categoría no-fuga | Incidencia `dismissed` o urgencia cap 40 |
| AGEB rural baja población | I bajo por diseño |

## 10. Calibración futura

- Regresión contra tiempos reales de reparación (si datos operador disponibles).
- Ajuste `P_ref`, umbrales bandas, pesos con comité operativo.
- Tests golden en pytest con vectores fijos.

Pruebas: [../10-testing/test-cases.md](../10-testing/test-cases.md).