# Decisiones de arquitectura (registro)

| ID | Decisión | Estado | Rationale |
|----|----------|--------|-----------|
| ADR-001 | Monolito modular | Aceptada | Menor costo operativo MVP |
| ADR-002 | PostGIS + SRID 4326 | Aceptada | Alineación OSM/Leaflet |
| ADR-003 | Reportes inmutables (soft delete prohibido en MVP) | Aceptada | Auditoría y confianza ciudadana |
| ADR-004 | Incidencia agrupa N reportes | Aceptada | Priorización y operación |
| ADR-005 | Confirmación ≠ reporte | Aceptada | Reduce spam duplicado |
| ADR-006 | Urgencia determinista sin ML | Aceptada | Explicabilidad legal/operativa |
| ADR-007 | Notificaciones in-app primero | Aceptada | Evita dependencia SMTP en MVP |
| ADR-008 | Fotos en filesystem volumen | Aceptada | Simplicidad; S3 en producción escalada |
| ADR-009 | Categorías no-fuga no auto-incidencia | Aceptada | Evita ruido operativo |
| ADR-010 | geoalchemy2 + Shapely en backend | Propuesta | Tipado geometría SQLAlchemy |

## Pendientes

| Tema | Opciones | Responsable futuro |
|------|----------|-------------------|
| Email transaccional | SMTP municipal vs. proveedor | Superadmin + Infra |
| Anonimización coordenadas en mapa público | Jitter 20–50 m | Producto + Privacidad |
| Cobertura geográfica piloto | Un municipio vs. estado | Stakeholders |

Plantilla para nuevas ADR: [../13-decisions/adr-template.md](../13-decisions/adr-template.md).