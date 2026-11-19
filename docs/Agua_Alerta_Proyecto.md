# Agua Alerta: Mapa Ciudadano y Priorización de Fugas

## 1. Descripción del proyecto

**Reto 04: Servicios Públicos --- HackPony 2026**

Agua Alerta es una plataforma web para que los ciudadanos reporten fugas
de agua potable y para que las autoridades puedan visualizar, agrupar y
priorizar esos reportes.

La problemática planteada en el reto es que una parte importante del
agua potable en municipios mexicanos se desperdicia por fugas callejeras
que pueden tardar semanas en atenderse debido a la falta de priorización
y a los reportes duplicados.

**Misión del equipo:** construir una plataforma de reporte ciudadano
geolocalizado que agrupe reportes cercanos automáticamente y calcule un
índice de urgencia para organizar las cuadrillas de reparación.

## 2. Objetivo y propuesta de valor

La aplicación no se limita a recibir reportes: ayuda a identificar
cuáles fugas requieren atención primero.

Se propone dividirla en dos áreas principales:

### A. Aplicación ciudadana

-   Registrar una fuga de agua.
-   Marcar su ubicación en un mapa.
-   Indicar el nivel de desperdicio: goteo, chorro o inundación.
-   Adjuntar una fotografía.
-   Consultar el estado del reporte.

### B. Panel administrativo

-   Visualizar los reportes en un mapa.
-   Identificar reportes cercanos o posiblemente duplicados.
-   Calcular automáticamente la prioridad.
-   Ordenar las fugas de mayor a menor urgencia.
-   Cambiar el estado de cada reporte, por ejemplo, de **Pendiente** a
    **En atención**.

## 3. Funcionalidades recomendadas

### 3.1 Registro de fugas

Formulario para que el ciudadano indique:

-   Tipo de fuga.
-   Nivel de desperdicio.
-   Ubicación.
-   Fotografía.

### 3.2 Mapa interactivo

Mostrar las fugas mediante marcadores de colores según su urgencia. Una
propuesta visual es:

-   **Rojo:** urgente.
-   **Amarillo:** prioridad media.
-   **Verde:** prioridad baja.

### 3.3 Sistema automático de priorización

Calcular un índice de urgencia considerando el nivel de desperdicio y la
cantidad de reportes cercanos.

### 3.4 Panel administrativo

Mostrar los reportes ordenados de mayor a menor urgencia y permitir
actualizar su estado.

### 3.5 Estadísticas

Mostrar indicadores como:

-   Total de fugas reportadas.
-   Fugas pendientes.
-   Fugas atendidas.
-   Fugas de alta prioridad.

## 4. Propuesta de algoritmo de urgencia

Una primera versión del algoritmo puede asignar puntos según el tipo de
fuga y sumar puntos cuando existen varios reportes cercanos.

  Condición                                                 Puntos
  ------------------------------------------------------- --------
  Goteo                                                         10
  Chorro constante                                              30
  Inundación                                                    50
  Cada reporte adicional cercano (dentro de 100 metros)        +15
  Máximo adicional por reportes cercanos                       +30

La fórmula propuesta es:

\[ U = D + `\min`{=tex}(15(N-1),30) \]

Donde:

-   **U:** índice de urgencia.
-   **D:** puntos asignados al nivel de desperdicio.
-   **N:** cantidad de reportes cercanos, incluyendo el reporte actual.

### Ejemplo

Tres ciudadanos reportan una fuga en la misma zona. Los tres reportes
están a menos de 100 metros y describen un chorro constante.

\[ U = 30 + `\min`{=tex}(15(3-1),30) \]

\[ U = 30 + 30 = 60 \]

El resultado es **60 puntos**.

Este algoritmo es una propuesta inicial. Sus pesos y umbrales deben
ajustarse y probarse durante el desarrollo. La puntuación no representa
una medición real del volumen de agua desperdiciada.

## 5. Diseño general de la interfaz

Se recomienda una aplicación web con cuatro secciones principales:

1.  **Inicio o resumen:** indicadores generales de reportes.
2.  **Mapa:** ubicación de las fugas y marcadores por prioridad.
3.  **Reportar:** formulario para registrar una nueva fuga.
4.  **Administración:** tabla de reportes, puntuación de urgencia y
    cambio de estado.

### Ejemplo de información en el panel

  Reporte                       Puntuación ilustrativa Estado
  --------------------------- ------------------------ -------------
  Fuga en avenida principal                         80 Pendiente
  Fuga cerca del parque                             60 Pendiente
  Goteo en calle secundaria                         10 En atención

Los datos de esta tabla son únicamente ilustrativos.

## 6. Tecnologías sugeridas

Para desarrollar el prototipo en el tiempo disponible, se propone
utilizar herramientas sencillas:

  Tecnología      Uso
  --------------- -----------------------------------------------
  HTML            Estructura de la página
  CSS             Diseño y estilos
  JavaScript      Lógica y funcionalidades
  Leaflet         Mapa interactivo
  OpenStreetMap   Datos de mapas
  Supabase        Base de datos y almacenamiento de fotografías

Enlaces oficiales:

-   [Leaflet](https://leafletjs.com/)
-   [OpenStreetMap](https://www.openstreetmap.org/)
-   [Supabase](https://supabase.com/)

Si el equipo tiene poca experiencia, puede comenzar con HTML, CSS y
JavaScript sin utilizar React. Lo prioritario es conseguir un prototipo
funcional.

## 7. Plan de desarrollo de ocho horas

El reto establece un tiempo límite de **8 horas continuas** para
desarrollar el Producto Mínimo Viable (MVP).

  -----------------------------------------------------------------------
  Tiempo                  Actividad               Tareas
  ----------------------- ----------------------- -----------------------
  Hora 1                  Diseño de la aplicación Definir pantallas,
                                                  colores, estructura y
                                                  modelo de datos.

  Horas 2--3              Formulario de reportes  Crear reportes con
                                                  ubicación, nivel de
                                                  desperdicio y
                                                  fotografía.

  Hora 4                  Mapa interactivo        Mostrar marcadores de
                                                  las fugas.

  Hora 5                  Algoritmo de urgencia   Detectar reportes
                                                  cercanos y calcular
                                                  puntuaciones.

  Hora 6                  Panel administrativo    Ordenar reportes y
                                                  actualizar sus estados.

  Hora 7                  Integración y pruebas   Conectar las funciones
                                                  y corregir errores.

  Hora 8                  Preparar demostración   Cargar datos de prueba
                                                  y ensayar la
                                                  presentación.
  -----------------------------------------------------------------------

## 8. Cómo demostrar el proyecto ante el jurado

Se recomienda preparar una demostración en vivo con este flujo:

1.  Un ciudadano registra una fuga en el mapa.
2.  Otro ciudadano registra una fuga en la misma ubicación o cerca de
    ella.
3.  El sistema detecta que los reportes están dentro del radio
    establecido.
4.  La urgencia aumenta automáticamente.
5.  El administrador observa que la fuga aparece más arriba en la lista
    de prioridades.
6.  El administrador cambia su estado a **En atención**.

Esta demostración permite enseñar el registro, la geolocalización, la
agrupación de reportes, el cálculo de urgencia y la administración de
estados.

## 9. Cómo orientar el proyecto a la rúbrica

La rúbrica oficial tiene un total de **100 puntos**:

  ------------------------------------------------------------------------
  Criterio                            Puntaje máximo Qué deben demostrar
  --------------------- ---------------------------- ---------------------
  Prototipo funcional                      45 puntos Ejecución y
  (código)                                           estabilidad, flujo
                                                     principal del MVP,
                                                     funcionalidades
                                                     esenciales, lógica y
                                                     manejo de datos,
                                                     integración y
                                                     respuesta.

  Impacto y pertinencia                    25 puntos Comprensión del
  en México                                          problema, pertinencia
                                                     de la solución en
                                                     México, beneficio
                                                     para el usuario
                                                     objetivo y
                                                     viabilidad.

  Experiencia de                           15 puntos Claridad visual,
  usuario (UX/UI)                                    navegación,
                                                     comprensión inmediata
                                                     y adaptación al
                                                     usuario objetivo.

  Pitch y claridad de                      15 puntos Explicación del
  presentación                                       problema y propuesta,
                                                     demostración del
                                                     producto, dominio y
                                                     argumentación,
                                                     comunicación y
                                                     tiempo.
  ------------------------------------------------------------------------

El prototipo funcional representa la mayor parte de la calificación. Por
eso, es importante que las funciones principales se puedan utilizar y
demostrar en vivo, no solamente mostrar en diapositivas.

## 10. Estructura de la exposición

La ficha técnica establece tres fases de exposición, cada una con un
máximo de cinco minutos:

### Fase 1. Exposición del proyecto --- 5 minutos

Participan los integrantes que deseen hacerlo.

Enfoque: demostración en vivo del prototipo y explicación general, no
técnica. Deben explicar la problemática atendida, la propuesta
desarrollada, los costos, los requerimientos y el funcionamiento.

### Fase 2. Demostración técnica --- 5 minutos

Participan los integrantes que deseen hacerlo.

Enfoque: explicar los aspectos técnicos del proyecto, la arquitectura,
las tecnologías utilizadas, la navegación completa y la implementación
del código.

### Fase 3. Preguntas del jurado --- 5 minutos

Participa el equipo.

Enfoque: responder preguntas sobre la propuesta, su funcionamiento y las
decisiones técnicas de desarrollo.

**Importante:** la ficha técnica indica que no se otorgarán puntos por
funcionalidades que solamente aparezcan en diapositivas y no se
demuestren en vivo. También señala que exceder los tiempos máximos puede
ocasionar una penalización de puntaje.

## 11. Recomendaciones finales

-   Mantener el alcance del proyecto controlado: primero desarrollar el
    flujo principal.
-   Asegurarse de que los reportes se puedan registrar y visualizar.
-   Probar que el cálculo de urgencia cambie cuando hay reportes
    cercanos.
-   Verificar que el panel administrativo ordene los reportes
    correctamente.
-   Preparar datos de prueba para la demostración.
-   Priorizar una interfaz clara y fácil de entender.
-   Ensayar la exposición respetando los tiempos establecidos.

La idea central que debe quedar clara ante el jurado es:

> **Agua Alerta convierte reportes ciudadanos dispersos en información
> organizada para ayudar a priorizar la reparación de fugas de agua.**
