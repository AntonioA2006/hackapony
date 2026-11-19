# Recursos de diseño evaluados

Se revisaron los repositorios pedidos contra el stack real (React 19, Tailwind 3, Leaflet, Firebase). Solo entra al producto lo que no duplica el sistema ni cambia el motor del mapa o de la autenticación.

## Skills de agente (`spencerpauly/awesome-cursor-skills`)

Esas skills son instrucciones para el agente (auditoría visual, accesibilidad, copy, rendimiento). No son dependencias de la aplicación. No se instalaron dentro del repositorio ni se ejecutó `npx skills add`: ese instalador copia prompts al entorno del editor y no mejora el build de Agua Alerta. Las prácticas que sí aplican a este cambio se hicieron en el código:

- Diseño de interfaz sobre los tokens existentes, no una plantilla nueva.
- Copy en español, concreto, sin cifras inventadas.
- Revisión responsive, foco visible, `prefers-reduced-motion` y textos alternativos.
- Verificación con los tests que ya tiene el repo (`vitest`, `pytest` del endpoint público).

## Librerías revisadas y decisión

| Recurso | Decisión |
| --- | --- |
| shadcn/ui | No. El proyecto ya tiene botones, campos, avisos y etiquetas en Tailwind. Montar otro kit duplicaría componentes. |
| Magic UI, motion-primitives | No. Efectos de demostración. Las transiciones quedan en CSS del sistema, con respeto a reducir movimiento. |
| Motion | No. El bundle no gana un runtime de animación para hovers y un toast de 1.5 s. |
| Lucide | No. Los iconos necesarios son SVG inline (marca y teléfono) para no sumar un paquete. |
| daisyUI | No. Segunda capa de componentes sobre Tailwind. |
| MapLibre GL | No. El mapa operativo es Leaflet (react-leaflet, teselas, máscara, bbox). Cambiar el motor reescribiría el mapa. |
| react-three-fiber | No. No hay una escena 3D en el producto. |
| Playwright | No en esta entrega. El frontend ya prueba con Vitest. Añadir navegadores solo para una pasada visual no justifica la dependencia. La agrupación de marcadores tiene prueba unitaria. |
| Inter / Geist / Plus Jakarta Sans | Se mantiene Inter + Inter Tight, ya cargadas y parecidas a la tipografía de productos SaaS. No se descarga una tercera familia. |

## Identidad aplicada

- Tinta `#142235`, profundidad `#0B1F33`, acción `#1479E8`, acento `#38BDF8`, turquesa `#14B8A6`, lienzo `#F7FAFC`, superficies blancas.
- Los nombres de token (`ink`, `cyan`, `canvas`, `soot`) se conservan para que todas las pantallas hereden el cambio sin reescribir cada clase.
- El resaltado de titulares deja de ser un marcador fluorescente y pasa a ser color de acción.

## Qué quedó en el producto y qué no

Implementado sobre lo que el backend ya soporta: identidad por tokens, navegación con Inicio, Mapa, Reportes, Estadísticas y Acerca de, hero, indicadores reales (reportes, pendientes, resueltas, satisfacción, tiempo y zonas validadas), agrupación de marcadores al alejar el mapa, filtros de categoría y prioridad sobre la vista cargada, progreso del formulario de reporte, botón flotante de contacto de demostración con el aviso «Contáctanos» durante 1.5 s.

No se simula: llamadas al número ficticio, actividad de usuarios que no existe, gráficos de zonas sin incidencias validadas, ni un motor de mapa nuevo. Notificaciones, perfiles, fotos y seguimiento ya existían y se conservan.
