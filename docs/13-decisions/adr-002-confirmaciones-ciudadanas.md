# ADR-002 — Confirmaciones sin nuevo reporte

- **Estado:** Aceptada
- **Fecha:** 2025-11-19

## Contexto

Duplicación masiva en mapas ciudadanos.

## Decisión

Tabla `citizen_confirmations` con UNIQUE (incident_id, user_id); incrementa factor C en urgencia.

## Consecuencias

Menos ruido en `reports`; requiere login para confirmar.

Ver [../07-business-logic/incident-prioritization.md](../07-business-logic/incident-prioritization.md).