# Visión general — Agua Alerta

## Resumen ejecutivo

**Agua Alerta** es una plataforma web orientada a la participación ciudadana para **registrar, analizar y priorizar fugas y otros problemas del servicio de agua potable**. Combina reportes georreferenciados, procesamiento geoespacial (PostgreSQL/PostGIS) y **contexto territorial** derivado de fuentes oficiales (principalmente INEGI), sin sustituir la información operativa en tiempo real del organismo operador.

> **Alcance de esta carpeta:** especificación para desarrollo futuro. Ningún comportamiento descrito está implementado en el repositorio actual (repositorio vacío al 2025-11-19).

## Propuesta de valor

Transformar reportes dispersos en **información geográfica estructurada**: incidencias agrupadas, índice de urgencia explicable, mapas de concentración y estimaciones de **población potencialmente expuesta** (no “personas afectadas” en sentido causal).

## Usuarios principales

| Actor | Interés |
|-------|---------|
| Ciudadano | Reportar, corroborar incidencias públicas, dar seguimiento (“Mis reportes”) |
| Administrador | Validar, agrupar, priorizar y actualizar estados |
| Superadministrador | Usuarios, roles y configuración global |

Detalle de roles: [stakeholders.md](./stakeholders.md) y [../09-security/security-architecture.md](../09-security/security-architecture.md).

## Módulos funcionales

1. **Ciudadano** — registro, mapa público, confirmaciones, notificaciones in-app (MVP).
2. **Administrativo** — dashboard, gestión de incidencias, estadísticas.
3. **Datos oficiales** — importación y consulta de capas INEGI/CONAGUA verificadas.
4. **Análisis geográfico** — proximidad, agrupamiento, relación reporte ↔ AGEB/municipio.

Requisitos detallados: [../02-requirements/functional-requirements.md](../02-requirements/functional-requirements.md).

## Stack tecnológico (obligatorio)

| Capa | Tecnologías |
|------|-------------|
| Frontend | React, Vite, TypeScript, Tailwind CSS, Leaflet, OpenStreetMap |
| Backend | Python, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic |
| Datos | PostgreSQL 16+, PostGIS 3.4+ |
| ETL/análisis | Pandas, GeoPandas, Shapely |

Versiones recomendadas: [../03-architecture/system-architecture.md](../03-architecture/system-architecture.md#versiones-recomendadas).

## Principios de diseño

- **Monolito modular** para el MVP (un despliegue, límites claros por paquetes).
- **Determinismo** en agrupamiento y priorización (sin IA obligatoria).
- **Trazabilidad** — no eliminar reportes originales; historial de estados.
- **Privacidad** — mapa público sin datos personales de reportantes.
- **Honestidad de datos** — distinguir reportes ciudadanos vs. estadística oficial.

## Documentos relacionados

- Problema: [problem-statement.md](./problem-statement.md)
- Alcance MVP: [objectives-and-scope.md](./objectives-and-scope.md)
- Arquitectura: [../03-architecture/system-architecture.md](../03-architecture/system-architecture.md)