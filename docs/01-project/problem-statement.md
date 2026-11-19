# Planteamiento del problema

## Situación actual

Los reportes de fugas y fallas de suministro suelen llegar por canales heterogéneos (redes sociales, llamadas, apps municipales aisladas, reportes presenciales). La información queda:

- **Fragmentada** en múltiples medios.
- **Difícil de georreferenciar** de forma uniforme.
- **Sujeta a duplicación** (varias personas reportan el mismo evento).
- **Pobre en analítica espacial** para priorizar brigadas.
- **Limitada en historial** consultable y comparable.

## Impacto

| Área | Consecuencia |
|------|----------------|
| Operación | Reparaciones retrasadas o mal priorizadas |
| Ciudadanía | Percepción de falta de respuesta |
| Gestión pública | Decisión sin mapas de concentración ni series históricas |
| Agua | Pérdidas no contabilizadas por reporte disperso |

## Qué no resuelve INEGI/CONAGUA por sí solos

Las fuentes oficiales aportan **marco geoestadístico, demografía y gestión municipal del agua** (ver [../06-data-sources/](../06-data-sources/)). **No** proporcionan, en general:

- Fugas a nivel de calle en tiempo real.
- Flujo de tickets ciudadanos unificado.

Los **reportes ciudadanos** son la fuente primaria de incidencias operativas en Agua Alerta; los datos oficiales son **contexto**.

## Objetivo del producto

Centralizar reportes, convertirlos en **incidencias geográficas** con urgencia calculada y dar herramientas de gestión a administradores, manteniendo participación ciudadana visible (mapa público y corroboraciones).

## Hipótesis de solución

Una plataforma única con:

1. Captura estandarizada (ubicación, fotos, categoría).
2. Detección de duplicados y agrupamiento espacial.
3. Priorización explicable (0–100).
4. Dashboard administrativo y mapa público sin exponer identidad.

Ver [objectives-and-scope.md](./objectives-and-scope.md) para límites del MVP.