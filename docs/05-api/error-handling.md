# Manejo de errores API

## Formato

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Uno o más campos son inválidos.",
    "details": [
      { "field": "email", "issue": "invalid_format" }
    ],
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Códigos HTTP

| HTTP | Uso |
|------|-----|
| 400 | Validación de negocio |
| 401 | Token ausente/inválido |
| 403 | Rol insuficiente |
| 404 | Recurso inexistente |
| 409 | Conflicto (confirmación duplicada, folio) |
| 413 | Archivo excede tamaño |
| 415 | MIME no permitido |
| 422 | Validación Pydantic |
| 429 | Rate limit |
| 500 | Error interno (sin filtrar stack al cliente) |

## Códigos `error.code` estables

| code | Descripción |
|------|-------------|
| `AUTH_INVALID_CREDENTIALS` | Login fallido |
| `AUTH_TOKEN_EXPIRED` | Access expirado |
| `FORBIDDEN` | RBAC |
| `NOT_FOUND` | ID inexistente |
| `DUPLICATE_CONFIRMATION` | Ya confirmó incidencia |
| `REPORT_REJECTED_REQUIRES_REASON` | Falta motivo |
| `RATE_LIMIT_EXCEEDED` | Spam |

## Validaciones transversales

- Coordenadas: lat ∈ [-90,90], lon ∈ [-180,180].
- `title`: 5–120 caracteres.
- `description`: máx 2000.
- Fotos: máx 5 por reporte, 5 MB c/u, jpeg/png/webp.