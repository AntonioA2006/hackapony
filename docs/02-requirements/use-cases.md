# Casos de uso

## UC-01 Registrar reporte con geolocalización

**Actor principal:** Ciudadano  
**Precondiciones:** Sesión iniciada; navegador con permiso de ubicación (opcional).

**Flujo principal:**

1. Usuario abre "Reportar problema".
2. Completa título, categoría, descripción, referencia.
3. Obtiene coordenadas por GPS o pin en mapa.
4. El cliente consulta incidencias/reportes cercanos.
5. Si hay candidato, muestra opción confirmar incidencia existente o continuar.
6. Adjunta fotos; envía `POST /api/v1/reports`.
7. Sistema persiste reporte, fotos y ejecuta lógica de asociación/incidencia.
8. Usuario recibe folio y notificación "recibido".

**Postcondiciones:** Reporte en estado `received`; posible vínculo a incidencia nueva o existente.

## UC-02 Confirmar incidencia pública

**Actor:** Ciudadano autenticado  
**Flujo:** Mapa público → detalle incidencia → Confirmar → `POST /api/v1/incidents/{id}/confirm` → incrementa contador; sin nuevo reporte.

**Excepción:** Segunda confirmación del mismo usuario → 409.

## UC-03 Validar reporte (admin)

**Actor:** Administrador  
**Flujo:** Lista reportes `under_review` → abrir → validar o rechazar con motivo → actualiza reporte e historial → puede promover a incidencia operativa según categoría.

## UC-04 Agrupamiento automático

**Disparador:** Creación de reporte o job batch  
**Sistema:** Busca incidencias/reportes dentro de `GROUPING_DISTANCE_M` (default 75 m); si coincide, asocia; si no, crea incidencia cuando categoría es de fuga.

Ver [../07-business-logic/incident-management.md](../07-business-logic/incident-management.md).

## UC-05 Calcular urgencia

**Disparador:** Cambio en reportes agrupados, confirmaciones, gravedad o tiempo  
**Salida:** `urgency_score` 0–100 y categoría Crítica/Alta/Media/Baja.

Ver [../07-business-logic/incident-prioritization.md](../07-business-logic/incident-prioritization.md).

## UC-06 Importar Marco Geoestadístico / indicadores

**Actor:** Superadministrador  
**Flujo:** Ejecutar job ETL → descarga/lectura fuente INEGI → normaliza SRID 4326 → upsert `municipalities`, `census_areas`, `inegi_indicators` → registra `data_import_runs`.

Ver [../06-data-sources/data-ingestion.md](../06-data-sources/data-ingestion.md).

## UC-07 Consultar mapa público

**Actor:** Anónimo o ciudadano  
**Flujo:** `GET /api/v1/incidents/public` con bbox/filtros → render en Leaflet sin campos PII.