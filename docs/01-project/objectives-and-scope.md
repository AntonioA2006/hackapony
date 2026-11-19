# Objetivos y alcance

## Objetivos

1. Permitir a ciudadanos **registrar y dar seguimiento** a reportes de agua potable.
2. **Agrupar** reportes cercanos en incidencias y calcular **urgencia** (0–100).
3. Ofrecer a administradores **priorización, mapas y estadísticas**.
4. Enriquecer análisis con **zonas censales/municipios** desde INEGI (importación batch).
5. Mantener **auditoría** de cambios de estado y trazabilidad de reportes.

## Alcance MVP (obligatorio)

| Incluido | Excluido / fase posterior |
|----------|---------------------------|
| Registro, login, perfil básico, recuperación de contraseña (diseño) | SSO gubernamental |
| CRUD reportes, fotos, geolocalización y pin en mapa | IA para clasificar fotos |
| Mapa público de incidencias (sin PII) | App nativa iOS/Android |
| Confirmaciones ciudadanas por incidencia | Push móvil (diseño preparado) |
| Agrupamiento y duplicados sugeridos | Integración SCADA/red hidráulica |
| Algoritmo de urgencia determinista | Microservicios |
| Dashboard admin (lista, mapa, estados) | Cobertura nacional INEGI día 1 (priorizar pilot municipio/estado) |
| Importación manual/programada de capas INEGI verificadas | Tiempo real CONAGUA |
| Notificaciones **in-app** | Email obligatorio en MVP |
| Docker Compose para dev/staging | HA multi-región |

## Categorías de reporte (ciudadano)

No todo reporte genera incidencia tipo “fuga”. Categorías iniciales:

| Código | Etiqueta | ¿Puede abrir incidencia operativa? |
|--------|----------|-----------------------------------|
| `leak_public_road` | Fuga en vía pública | Sí |
| `broken_pipe` | Tubería rota | Sí |
| `public_infra_leak` | Fuga en infraestructura pública | Sí |
| `flood_from_leak` | Inundación por fuga | Sí |
| `supply_issue` | Problemas de suministro | Condicional (workflow revisión) |
| `other_water` | Otros relacionados con agua | Condicional |

Reglas: [../07-business-logic/incident-management.md](../07-business-logic/incident-management.md).

## Métricas de éxito (post-implementación)

- Tiempo medio de primer cambio de estado tras reporte.
- % reportes agrupados vs. huérfanos.
- Correlación urgencia ↔ orden de atención admin (calibración futura).
- Tasa de corroboraciones por incidencia pública.

## Fuera de alcance documental

Esta documentación **no** incluye código de aplicación ni pipelines productivos; solo especificaciones en `docs/`.