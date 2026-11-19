# Arquitectura de seguridad

## Autenticación

- Registro/login → JWT access + refresh.
- Hash contraseña: bcrypt o Argon2id.
- Refresh almacenado hashed en tabla `refresh_tokens` (tabla adicional propuesta) o rotación stateless con allowlist.

## Autorización (RBAC)

Roles: `CIUDADANO`, `ADMINISTRADOR`, `SUPERADMINISTRADOR` — matriz en [../01-project/stakeholders.md](../01-project/stakeholders.md).

Dependencias FastAPI por ruta.

## Validación de entradas

- Pydantic schemas; límites longitud.
- Coordenadas acotadas.

## SQL Injection

- SQLAlchemy ORM / text() parametrizado únicamente.

## Fotografías

- Almacenamiento fuera de directorio público.
- Nombres opacos UUID.
- Validación MIME y tamaño (5 MB).
- Opcional strip EXIF en procesamiento futuro.

## Rate limiting

- Creación reportes: 10/h por usuario, 30/h por IP (propuesta MVP).
- Login: 5 intentos / 15 min por IP.

## CORS

- Orígenes whitelist: dominio frontend producción + localhost dev.

## Endpoints administrativos

- Prefijo `/admin` y filtros rol en servicios.

## Secretos

Variables entorno: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PHOTOS_PATH`.

Ver [environment-variables.md](../11-infrastructure/environment-variables.md).

## Auditoría

`incident_history` + logs auth admin.