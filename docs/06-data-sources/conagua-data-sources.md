# Fuentes CONAGUA (complementarias)

## Estado de verificación

Durante la documentación (nov-2025), el acceso automatizado a algunas URLs de `gob.mx/conagua` devolvió **HTTP 403** al fetch programático. Las entradas abajo distinguen **verificado manualmente en fuente primaria** vs **pendiente**.

CONAGUA aporta principalmente **contexto hidrológico y gestión de recursos**, no reportes ciudadanos de fugas urbanas.

## 1. Portal CONAGUA — datos abiertos

| Campo | Valor |
|-------|-------|
| Institución | Comisión Nacional del Agua (CONAGUA) |
| URL propuesta | https://www.gob.mx/conagua (sección documentos/datos abiertos) |
| Estado | **Pendiente de verificar** enlaces y catálogo vigente por bloqueo 403 en verificación automática |
| Uso propuesto en Agua Alerta | Referencia opcional para capas regionales (presas, distritos de riego) en visualizaciones admin — **no** MVP obligatorio |

## 2. SINA (Sistema Nacional de Información del Agua)

| Campo | Valor |
|-------|-------|
| Referencia | Portal histórico CONAGUA/SINA |
| Estado | **Pendiente** — confirmar URL activa y términos |
| Variables potenciales | Datos hidrometeorológicos agregados |
| Uso propuesto | Contexto en mapas; **sin** correlación directa con incidencia de fuga en banqueta |

## 3. Atlas de Riesgo / Vulnerabilidad al cambio climático (si disponible)

| Campo | Valor |
|-------|-------|
| Estado | **Pendiente** |
| Uso propuesto | Capa contextual futura |

## Política de integración MVP

1. **Prioridad 1:** INEGI (marco geoestadístico + CNGMD).  
2. **Prioridad 2:** CONAGUA tras inventario manual y licencia de uso.  
3. Registrar cada dataset en `data_source_catalog` antes de exponer en API.

## Aplicación concreta (propuesta)

| Función Agua Alerta | ¿CONAGUA MVP? |
|---------------------|---------------|
| Priorizar fuga urbana | No depende de CONAGUA |
| Mapa admin contexto hidrológico | Opcional futuro |
| Estimación población AGEB | INEGI, no CONAGUA |

Cuando se verifique una fuente, actualizar este documento con URL, variables y fecha de verificación.