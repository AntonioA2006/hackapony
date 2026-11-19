# Privacidad

## Minimización

- Mapa público sin nombre, email, user_id, fotos ciudadanas.
- Confirmaciones sin exponer lista de usuarios.

## Ubicación

- Precisión completa almacenada para operación (admin y dueño del reporte).
- El mapa público y `GET /reports/nearby` publican `public_location`: snap a ~30 m más un jitter determinista HMAC. Ver [ADR-016](../13-decisions/adr-016-ubicacion-publica.md).

## Datos personales

- Email solo visible al propio usuario y superadmin.
- Base legal: consentimiento en registro (checkbox términos).

## Fotografías

- Pueden contener terceros; política de uso operativo; retención ver [../06-data-sources/data-governance.md](../06-data-sources/data-governance.md).
- Acceso público prohibido.

## Reportes falsos / spam

- Rate limits, validación admin, rechazo con motivo.
- Sin eliminación para investigación.

## Derechos ARCO

Proceso manual MVP; endpoint exportación post-MVP (propuesta).

## Niños

Plataforma no dirigida a menores; términos 18+ (propuesta legal).