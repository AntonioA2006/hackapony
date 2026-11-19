# Estándares de calidad

## Cobertura mínima objetivo (post Fase 9)

| Área | Cobertura líneas |
|------|------------------|
| `domain/priority.py` | 100% |
| Servicios críticos reports/incidents | ≥ 80% |
| Routers API | ≥ 70% |
| Frontend features reports | ≥ 60% |

## Linting

- Backend: `ruff`, `mypy` (modo gradual).
- Frontend: `eslint`, `tsc --noEmit`.

## Migraciones

Toda migration reversible cuando sea posible; probar up/down en CI.

## Definition of Done

Ver [../12-project-management/definition-of-done.md](../12-project-management/definition-of-done.md).