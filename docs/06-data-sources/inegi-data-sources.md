# Fuentes de datos INEGI

Leyenda de estado:

- **Verificado:** consultado en documentación/sitio oficial INEGI (noviembre 2025).
- **Pendiente:** requiere confirmación en ficha RNM o descarga antes de producción.
- **Propuesta:** uso planeado en Agua Alerta, sin afirmar disponibilidad de variable específica.

> INEGI **no** entrega fugas en calle ni reportes en tiempo real. Los reportes ciudadanos son la fuente operativa.

## 1. Tema Agua — portal temático

| Campo | Valor |
|-------|-------|
| Nombre | Tema Agua (INEGI) |
| Institución | INEGI |
| URL | https://www.inegi.org.mx/temas/agua/ |
| Estado | **Verificado** (portal accesible) |
| Descripción | Concentrador de información sobre agua: presentación, tabulados, publicaciones, mapas y herramientas vinculadas a programas estadísticos. |
| Variables | Depende del subprograma enlazado; en "Información general" se referencia contenido agregado (ej. tomas de agua para abastecimiento público con referencia temporal 2020 en página temática — **verificar** tabulado vigente en portal). |
| Cobertura | Nacional (según indicador) |
| Actualización | Según programa fuente (**no** uniforme) |
| Formatos | Web, enlaces a microdatos/publicaciones |
| Automatización | Parcial: scraping **no** recomendado; preferir RNM/API/descargas oficiales |
| Atribución | Crédito INEGI; revisar condiciones en cada dataset |
| Uso en Agua Alerta | Contexto y enlaces a indicadores municipales de agua para enriquecer dashboard admin |

## 2. Servicio Web Catálogo Único de Claves Geoestadísticas (wscatgeo v2)

| Campo | Valor |
|-------|-------|
| URL documentación | https://www.inegi.org.mx/servicios/catalogoUnico.html |
| Estado | **Verificado** |
| Descripción | APIs JSON/GeoJSON para AGEE, AGEM, localidades, AGEB, manzanas, vialidades. |
| Ejemplos URL (vectorial AGEB urbana por entidad) | `https://gaia.inegi.org.mx/wscatgeo/v2/geo/agebu/{cve_ent}` |
| Variables tabulares AGEB (metadato documentado) | `cvegeo`, `cve_ent`, `nom_ent`, `cve_mun`, `nom_mun`, `pob_total`, `pob_femenina`, `pob_masculina`, `total_viviendas_habitadas` |
| Cobertura | Nacional, por clave |
| Formato | JSON / GeoJSON vía HTTP GET |
| Automatización | **Sí** — cliente HTTP con throttling y caché |
| Atribución | INEGI; uso conforme a términos del servicio |
| Uso en Agua Alerta | Bootstrap `census_areas`, asignación espacial, población de referencia AGEB |

Documentación PDF consulta vectorial (fecha pie de página **12 de diciembre de 2024**): https://www.inegi.org.mx/servicios/descargas/Consulta_info_vectorial.pdf (**Verificado** existe).

## 3. Marco Geoestadístico (descarga m masiva)

| Campo | Valor |
|-------|-------|
| Nombre | Marco Geoestadístico |
| Institución | INEGI |
| URL ficha biblioteca | https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=889463807469 |
| Estado | **Verificado** (ficha referenciada en documentación INEGI); **Pendiente:** confirmar nombre exacto archivo ZIP vigente en ficha al momento de importar |
| Descripción | Límites oficiales entidad, municipio, AGEB, localidades |
| Formato | Shapefile/zip integrado |
| Automatización | Descarga periódica manual o script con verificación checksum |
| Uso en Agua Alerta | Fuente primaria offline para PostGIS; complementa API |

## 4. Datos abiertos INEGI

| Campo | Valor |
|-------|-------|
| URL | https://www.inegi.org.mx/datosabiertos/ |
| Estado | **Verificado** |
| Descripción | Publicación conforme Norma Técnica de Datos Abiertos |
| Formatos | CSV, JSON, geo según dataset |
| Uso | Selección puntual de indicadores; catalogar en `data_source_catalog` |

## 5. Censo Nacional de Gobiernos Municipales (CNGMD) — Módulo agua

| Campo | Valor |
|-------|-------|
| Nombre | CNGMD 2023, Módulo 6: Agua potable y saneamiento |
| URL catálogo RNM | https://www.inegi.org.mx/rnm/index.php/catalog/996 |
| Institución | INEGI |
| Estado | **Verificado** (metadatos catálogo) |
| Periodo referencia | 2022–2024 (según ficha catálogo) |
| Cobertura | Municipios y demarcaciones CDMX |
| Variables | Múltiples tablas microdatos (ej. prefijos documentados en diccionario: `servagua_cngmd2023`, `aguaprog_cngmd2023`, etc.) |
| Formato descarga | Microdatos vía RNM (**verificar** formatos disponibles en pestaña Descargas del catálogo al implementar) |
| Automatización | Parcial — descarga autenticada o manual según RNM; transformación con Pandas |
| Uso en Agua Alerta | Indicadores municipales en `inegi_indicators` (cobertura de red, programas, etc.) como **contexto** para priorización territorial (peso impacto) |

Edición anterior 2021 Módulo 5: https://www.inegi.org.mx/rnm/index.php/catalog/774 (**Verificado** referencia histórica).

## 6. Programa de estadísticas de agua potable y saneamiento

| Campo | Valor |
|-------|-------|
| URL programa | https://www.inegi.org.mx/programas/aps/ |
| Estado | **Pendiente** — confirmar tabulados vigentes y periodicidad en sitio |
| Uso propuesto | Series comparables agregadas |

## Resumen de aplicación

| Necesidad Agua Alerta | Fuente INEGI |
|-----------------------|--------------|
| Geometría municipio/AGEB | wscatgeo + Marco Geoestadístico |
| Población referencia AGEB | Atributos en servicio AGEB / Censo vinculado |
| Contexto gestión municipal agua | CNGMD Módulo 6 |
| Hidrología detallada | Limitada en INEGI tema Agua; ver CONAGUA |

Ingesta: [data-ingestion.md](./data-ingestion.md).