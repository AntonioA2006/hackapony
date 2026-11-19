# Auditoría de interfaz — Agua Alerta

Fecha: 2026-11-19. Alcance: frontend Vite + React en `frontend/`, sin reconstruir el producto.

## Stack y arquitectura

- Frontend: React 19, TypeScript, Vite, Tailwind 3, React Router 7, TanStack Query, Leaflet + react-leaflet.
- Tipografía ya cargada: Inter Variable (texto) e Inter Tight Variable (titulares).
- Backend: FastAPI. El navegador habla con `/api/v1`. Autenticación de producción: Firebase Auth (`frontend/src/shared/firebase`). En local, si no hay configuración de Firebase, la sesión usa la API.
- Mapas: teselas configurables, máscara de México, bbox del viewport, capa INEGI y marcadores de incidencia. El personal ve `GET /incidents/map`; el público, `GET /incidents/public` con coordenadas ofuscadas.
- Código dividido: las vistas de personal y cuadrilla se cargan con `lazy()`.

## Páginas

| Ruta | Uso |
| --- | --- |
| `/` | Inicio |
| `/mapa` | Mapa, región, lista de la vista |
| `/reportar` | Alta de reporte (sesión) |
| `/mis-reportes` | Seguimiento ciudadano |
| `/tablero` | Tablero y avisos |
| `/perfil` | Cuenta y verificación de correo |
| `/login`, `/registro`, `/recuperar`, `/restablecer`, `/auth/accion` | Acceso y Firebase |
| `/panel`, `/panel/incidencias`, `/panel/incidencias/:id`, `/panel/equipo` | Operación |
| `/cuadrilla`, `/cuadrilla/:id` | Órdenes de campo |

## Sistema visual previo

Tokens en `frontend/tailwind.config.js`: lienzo `#f5f9fc`, tinta `#0b2338`, acción `#0b84c6`, radios 6/10/16, sombras suaves. Componentes compartidos en `frontend/src/shared/ui` (botón, tarjeta, campo, aviso, etiqueta, esqueleto, contador). Estados de prioridad y de reporte ya tienen color semántico. `prefers-reduced-motion` ya apaga animaciones.

## Hallazgos

1. La navegación lista las rutas por rol, pero no presenta Inicio, Reportes, Estadísticas y Acerca de como producto. El estado activo casi no se distingue. El menú móvil es una lista plana.
2. El inicio explica el servicio, pero el hero no tiene una composición propia y las cifras públicas no contaban reportes, pendientes ni zonas.
3. El mapa funciona (viewport, región, leyenda, popup). No agrupa marcadores cuando hay muchos puntos cercanos. Los filtros de categoría y prioridad no existían sobre la lista ya cargada.
4. El formulario de reporte ya valida GPS (250 m), fotos, teléfono y México. No muestra un progreso de los pasos.
5. No había un contacto visible. No se debe inventar un teléfono operativo.
6. Responsive: ya hay `overflow-x: clip`, objetivos táctiles de 44 px y campos a 16 px en móvil. El ancho de página (1200 px) y el mapa en columna se conservan.
7. Duplicación baja: botones, campos y avisos salen de `shared/ui`. Las gráficas del personal son SVG propio (`shared/charts.tsx`), sin librería de charts.
8. Firebase sigue en el contexto de auth, verificación de correo y la página de acción del enlace. No se toca esa integración.

## Qué no se reconstruye

No se sustituye Leaflet, Firebase, el cliente de API ni los flujos de validación, cuadrilla y satisfacción. Un rediseño que reemplace esas piezas rompería el producto.
