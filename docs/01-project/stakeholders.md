# Interesados y roles

## Stakeholders

| Grupo | Necesidad |
|-------|-----------|
| Ciudadanía | Canal simple, seguimiento, visibilidad del mapa |
| Operadores de agua / municipio | Cola priorizada, evidencia fotográfica, historial |
| Área de TI | Stack mantenible, seguridad, despliegue reproducible |
| INEGI / CONAGUA (como proveedores de datos) | Atribución y uso conforme a términos publicados |

## Roles del sistema

| Rol | Código | Descripción |
|-----|--------|-------------|
| Ciudadano | `CIUDADANO` | Crea reportes, consulta mapa público, confirma incidencias, ve sus reportes |
| Administrador | `ADMINISTRADOR` | Valida reportes, gestiona incidencias, estadísticas operativas |
| Superadministrador | `SUPERADMINISTRADOR` | Gestión de usuarios/administradores, parámetros globales, importaciones |

### Matriz de permisos (resumen)

| Acción | CIUDADANO | ADMINISTRADOR | SUPERADMINISTRADOR |
|--------|-----------|---------------|---------------------|
| Registrarse / login | Sí | Sí | Sí |
| Crear reporte | Sí | Sí* | Sí* |
| Ver mapa público | Sí | Sí | Sí |
| Confirmar incidencia | Sí | Sí | Sí |
| Ver PII de reportantes en mapa | No | No | No |
| Validar/rechazar reportes | No | Sí | Sí |
| Gestionar incidencias (estado) | No | Sí | Sí |
| Ver todos los reportes / filtros admin | No | Sí | Sí |
| Ejecutar import INEGI | No | Propuesta: no | Sí |
| CRUD usuarios y roles | No | No | Sí |
| Ajustar umbrales priorización | No | Propuesta: lectura | Sí |

\*Administradores pueden crear reportes de prueba; en producción restringir por política.

Detalle de seguridad: [../09-security/security-architecture.md](../09-security/security-architecture.md).

## Privacidad en mapas

El mapa público muestra incidencias agregadas (ubicación aproximada opcional en futuro), categoría, estado, conteo de corroboraciones y urgencia — **sin** nombre, email ni foto del reportante original.