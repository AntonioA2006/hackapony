# Riesgos

| ID | Riesgo | Prob. | Impacto | Mitigación |
|----|--------|-------|---------|------------|
| R1 | Reportes falsos / spam | Alta | Medio | Validación admin, rate limits |
| R2 | Datos INEGI desactualizados | Media | Medio | Metadatos `reference_year` en UI |
| R3 | GPS impreciso agrupamiento erróneo | Alta | Medio | Agrupación manual admin |
| R4 | Sobrecarga servicio INEGI | Baja | Alto | Throttle import, cache local |
| R5 | Fotos sensibles | Media | Alto | Acceso restringido, moderación |
| R6 | Interpretación errónea población AGEB | Media | Alto | Disclaimer UI obligatorio |
| R7 | Alcance geográfico piloto vs nacional | Alta | Medio | Lanzar un municipio/estado |
| R8 | CONAGUA URLs no automatizables | Media | Bajo | Priorizar INEGI |
| R9 | Scope creep IA/analytics | Media | Medio | ADR sin ML en priorización |

## Decisiones pendientes (riesgo de retraso)

1. ¿Mapa público antes o después de validación admin?
2. ¿Recuperación contraseña en MVP o Fase 2+?
3. Municipio piloto para geometrías.

Registrar resolución como ADR en `docs/13-decisions/`.