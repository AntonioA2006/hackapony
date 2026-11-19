# Requisitos no funcionales

## Rendimiento

| ID | Requisito | Objetivo MVP |
|----|-----------|--------------|
| NFR-PERF-001 | API p95 lectura reportes/incidencias | < 500 ms en dataset piloto (< 100k filas) |
| NFR-PERF-002 | Consulta espacial por radio | Uso de índices GiST; p95 < 300 ms |
| NFR-PERF-003 | Carga de foto | Hasta 5 MB por archivo; procesamiento async opcional post-MVP |

## Disponibilidad y operación

| ID | Requisito |
|----|-----------|
| NFR-OPS-001 | Health checks en API y DB |
| NFR-OPS-002 | Logs estructurados (JSON) con correlación request_id |
| NFR-OPS-003 | Backups diarios de PostgreSQL en producción |

## Seguridad

| ID | Requisito |
|----|-----------|
| NFR-SEC-001 | HTTPS en producción |
| NFR-SEC-002 | Contraseñas con hash Argon2/bcrypt |
| NFR-SEC-003 | JWT access + refresh con rotación |
| NFR-SEC-004 | RBAC por rol (`CIUDADANO`, `ADMINISTRADOR`, `SUPERADMINISTRADOR`) |
| NFR-SEC-005 | OWASP: validación entrada, ORM parametrizado, CORS restrictivo |

Ver [../09-security/](../09-security/).

## Escalabilidad

| ID | Requisito |
|----|-----------|
| NFR-SCA-001 | Monolito stateless; sesión en token |
| NFR-SCA-002 | Almacén de fotos en volumen/objeto (S3-compatible futuro) |

## Usabilidad y accesibilidad

| ID | Requisito |
|----|-----------|
| NFR-UX-001 | Responsive mobile-first en flujo de reporte |
| NFR-UX-002 | WCAG 2.1 nivel AA como objetivo en componentes críticos |
| NFR-UX-003 | Textos en español (México) |

## Mantenibilidad

| ID | Requisito |
|----|-----------|
| NFR-MNT-001 | Migraciones Alembic versionadas |
| NFR-MNT-002 | Tipado TypeScript estricto en frontend |
| NFR-MNT-003 | Cobertura mínima tests: ver [../10-testing/quality-standards.md](../10-testing/quality-standards.md) |

## Versiones de stack (fijar en dependencias al implementar)

| Componente | Versión recomendada | Notas |
|------------|---------------------|--------|
| Python | 3.12.x | LTS operativo del equipo |
| FastAPI | >=0.115,<0.116 | Compatible Pydantic v2 |
| Pydantic | >=2.9,<3 | Modelos API y settings |
| SQLAlchemy | >=2.0.36,<2.1 | Estilo 2.0 |
| Alembic | >=1.14,<2 | Migraciones |
| PostgreSQL | 16.x | Imagen postgis/postgis:16-3.4 |
| PostGIS | 3.4.x | Extensión en migración inicial |
| Node.js | 20 LTS | Build Vite |
| React | 18.3.x | Concurrent features |
| Vite | 6.x | |
| TypeScript | 5.6.x | |
| Tailwind CSS | 3.4.x | |
| Leaflet | 1.9.4 | |
| react-leaflet | 4.x | Par con React 18 |
| Pandas | >=2.2,<3 | ETL |
| GeoPandas | >=1.0,<2 | Requiere compatibilidad con GEOS/PROJ del contenedor |
| Shapely | >=2.0,<3 | Geometría |
| Pytest | >=8.3 | Backend tests |
| Vitest | >=2.1 | Frontend tests |

> Verificar matrices de compatibilidad en el momento del bootstrap; documentar pins exactos en `requirements.txt` / `package.json` al iniciar Fase 1.