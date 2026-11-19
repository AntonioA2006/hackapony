# Autenticación y usuarios

## POST `/auth/register`

| | |
|--|--|
| **Permiso** | Público |
| **Descripción** | Alta ciudadano (rol default `CIUDADANO`) |

**Request**

```json
{
  "email": "ciudadano@example.com",
  "password": "CadenaSegura12!",
  "display_name": "María López",
  "accept_terms": true
}
```

**Response 201**

```json
{
  "user": {
    "id": "uuid",
    "email": "ciudadano@example.com",
    "display_name": "María López",
    "role": "CIUDADANO"
  },
  "tokens": {
    "access_token": "…",
    "refresh_token": "…",
    "token_type": "bearer",
    "expires_in": 900
  }
}
```

**Errores:** 409 email duplicado; 422 validación.

## POST `/auth/login`

Público. Request: `email`, `password`. Response igual tokens.

## POST `/auth/logout`

Autenticado. Invalida refresh (lista denegados en DB o rotación). **204**.

## POST `/auth/password-reset/request` (MVP opcional)

Público. Acepta email; respuesta genérica 202 (sin enumerar usuarios).

## POST `/auth/password-reset/confirm` (MVP opcional)

Token + nueva contraseña.

## GET `/users/me`

Autenticado. Perfil actual.

## PATCH `/users/me`

Autenticado. Campos: `display_name`, `password` (requiere actual).

## GET `/users/me/reports`

Autenticado. Lista paginada de reportes propios; filtros `status`, fechas.

## GET `/users/me/notifications`

Autenticado. Paginación; `?unread_only=true`.

## PATCH `/users/me/notifications/{id}/read`

Autenticado. Marca leída. **204**.

## Gestión admin usuarios (superadmin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/users` | Listar |
| PATCH | `/admin/users/{id}` | Rol, is_active |
| POST | `/admin/users` | Crear admin |

Permiso: `SUPERADMINISTRADOR`.