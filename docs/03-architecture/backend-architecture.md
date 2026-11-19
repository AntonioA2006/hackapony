# Arquitectura backend

## Estructura de carpetas propuesta

```text
backend/
├── alembic/
│   └── versions/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── api/
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── router.py
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── reports.py
│   │       ├── incidents.py
│   │       ├── statistics.py
│   │       ├── inegi.py
│   │       └── notifications.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   │   ├── reports_service.py
│   │   ├── incidents_service.py
│   │   ├── grouping_service.py
│   │   ├── priority_service.py
│   │   ├── photos_service.py
│   │   └── notifications_service.py
│   ├── repositories/
│   ├── domain/
│   │   ├── enums.py
│   │   └── priority.py
│   └── integrations/
│       └── inegi/
├── scripts/
│   └── import_inegi.py
├── tests/
├── alembic.ini
├── pyproject.toml
└── requirements.txt
```

## Patrones

- **Repository** para consultas espaciales (`ST_DWithin`, `ST_Intersects`).
- **Service** orquesta transacciones: crear reporte → agrupar → recalcular urgencia → notificar.
- **Domain.priority** función pura testeable sin I/O.

## Endpoints montaje

Prefijo global: `/api/v1` — ver [../05-api/api-overview.md](../05-api/api-overview.md).

## Migraciones

1. `CREATE EXTENSION postgis;`
2. Tablas núcleo + índices GiST.
3. Seed roles y usuario superadmin (solo dev).

## Seguridad en capa API

- Dependencia `require_role("ADMINISTRADOR")` en routers admin.
- Upload: `python-multipart`, validación magic bytes.

Ver [../09-security/security-architecture.md](../09-security/security-architecture.md).