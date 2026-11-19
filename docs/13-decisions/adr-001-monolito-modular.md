# ADR-001 — Monolito modular

- **Estado:** Aceptada
- **Fecha:** 2025-11-19

## Contexto

MVP con equipo pequeño y plazo acotado.

## Decisión

Un solo servicio FastAPI con capas internas; sin microservicios.

## Consecuencias

Despliegue simple; límite de escala vertical inicial.

Alternativa rechazada: microservicios (sobre-ingeniería).