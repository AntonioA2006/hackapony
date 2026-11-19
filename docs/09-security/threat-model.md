# Modelo de amenazas (resumen STRIDE)

| Amenaza | Vector | Mitigación |
|---------|--------|------------|
| Suplantación | Robo token | HTTPS, refresh corto, logout |
| Manipulación | Cambio estado ajeno | RBAC, validación ownership |
| Repudio | Niega reporte | Historial inmutable |
| Divulgación | Mapa con PII | DTO público filtrado |
| Denegación | Flood reportes | Rate limit |
| Elevación privilegios | PATCH rol | Solo superadmin |

## Reportes falsos

Riesgo alto en mapa público → validación admin recomendada antes de escalar urgencia.

## Fotografías inapropiadas

Moderación admin; rechazo categoría; no publicar en mapa.

## Automatización maliciosa

CAPTCHA en registro (post-MVP propuesto); rate limit IP.

## Dependencias

Auditoría `pip audit` / `npm audit` en CI.