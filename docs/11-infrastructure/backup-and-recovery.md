# Respaldo y recuperación

## PostgreSQL

| Política | Frecuencia |
|----------|------------|
| `pg_dump -Fc` completo | Diario |
| WAL archiving | Producción recomendado |
| Retención | 30 días mínimo |

## Fotos

- Snapshot volumen o sync S3 versionado.
- Probar restore trimestral.

## RPO / RTO objetivo (propuesta)

| Métrica | Objetivo |
|---------|----------|
| RPO | 24 h |
| RTO | 4 h |

## Procedimiento restore

1. Detener API.
2. Restaurar DB a instancia limpia.
3. Restaurar volumen fotos si aplica.
4. `alembic stamp` si versión coincide.
5. Smoke tests.

## Desastres

Documentar contactos operativos (plantilla organizacional externa).