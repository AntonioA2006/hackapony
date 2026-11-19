# ADR-016 — Ubicación pública con jitter determinista

- **Estado:** Aceptada
- **Fecha:** 2026-11-19
- **Decisores:** Producto + Privacidad (cierra el pendiente de `architecture-decisions.md` y el hallazgo D5)

## Contexto

`GET /incidents/public` alimenta el mapa ciudadano. Publicar el centroide exacto permite localizar el reporte en la banqueta. Un jitter aleatorio en cada respuesta tampoco sirve: promediar varias lecturas reconstruye el punto. Filtrar el bbox contra el centroide real tiene el mismo problema: encoger el rectángulo acorrala la coordenada aunque la respuesta muestre otra.

## Decisión

Cada incidencia guarda `public_location` (geography Point, 4326), calculada al crearla y al recalcular el centroide:

1. Snap a una malla de 0.00027° (~30 m de latitud) con redondeo al nodo más cercano.
2. Desplazamiento dentro de la celda, en latitud y longitud, a partir de HMAC-SHA256(`LOCATION_HMAC_SECRET`, id de la incidencia). El offset queda en (−media celda, +media celda).
3. El punto se redondea a 6 decimales antes de guardarse y de salir en JSON.

`GET /incidents/public` filtra y devuelve solo `public_location`. El parámetro `bbox=minLon,minLat,maxLon,maxLat` se valida (cuatro números finitos, orden, rangos WGS84, como máximo 50° de longitud y 40° de latitud) y la consulta usa el operador `&&` sobre el índice GiST `incidents_public_location_gix`. Sin bbox la ruta sigue respondiendo, con el mismo tope de 200 incidencias por página. El admin y el dueño del reporte siguen viendo la coordenada real. `GET /reports/nearby`, que es público, aplica la misma función con el id del reporte.

## Consecuencias

- La incertidumbre publicada es de unas decenas de metros, suficiente para una fuga en vía pública.
- Rotar `LOCATION_HMAC_SECRET` no mueve los puntos ya guardados hasta que se recalcule el centroide.
- Quien conozca el secreto y el id puede restar el offset y recuperar el centro de la celda (~15 m). El secreto no va al cliente.
- `GET /reports/nearby` sigue buscando por la ubicación real dentro de un radio chico: la presencia del reporte en ese radio acota más que la coordenada devuelta. No es el mapa público.
- Clusters por zoom y una vista materializada (sección 8.1 de la arquitectura de referencia) no forman parte de esta decisión.

## Alternativas consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| Solo snap a la malla | Simple, expresable en SQL | El nodo de la malla es reversible y todos los puntos caen en la rejilla |
| Jitter aleatorio por request | Fácil | Promediar respuestas recupera el punto |
| Geohash de 7 caracteres (~150 m) | Muy barato | Más grueso de lo que el mapa necesita para una fuga |

## Referencias

- [reference-architecture.md](../03-architecture/reference-architecture.md) §8.2, hallazgo D5
- [incidents-endpoints.md](../05-api/incidents-endpoints.md)
- [privacy.md](../09-security/privacy.md)
