# Gobernanza de datos

## Clasificación

| Clase | Ejemplos | Tratamiento |
|-------|----------|-------------|
| Pública operativa | Incidencias agregadas en mapa | Sin PII |
| Personal | Email ciudadano | Cifrado tránsito, acceso RBAC |
| Evidencia | Fotos reportes | Almacenamiento restringido |
| Oficial INEGI/CONAGUA | Tablas derivadas | Atribución y no reventa |
| Generada plataforma | `urgency_score` | Documentar algoritmo |

## Linaje

`data_import_runs` + `data_source_catalog.last_verified_at`.

## Retención

| Dato | Política MVP (propuesta) |
|------|--------------------------|
| Reportes | Conservación indefinida; no borrado duro |
| Fotos | 24 meses post-resolución, luego archivar (**definir** con jurídico) |
| Logs | 90 días |
| Notificaciones | 12 meses |

## Calidad y veracidad

- Estimaciones de población en AGEB ≠ personas afectadas por fuga.
- Indicadores INEGI pueden tener rezago; mostrar `reference_year` en UI admin.

## Responsables (roles organizativos propuestos)

| Rol | Responsabilidad |
|-----|-----------------|
| Superadmin técnico | Importaciones y catálogo |
| Admin operativo | Validación reportes |
| Ciudadano | Exactitud de su reporte |

## Cumplimiento

Revisar LFPDPPP para datos personales en México; minimizar datos en frontend público.