# Agua Alerta · app móvil (Kotlin Multiplatform)

App nativa para **Android** (y base lista para **iOS**) con Compose Multiplatform. Usa la misma cuenta de
Firebase y la misma API que el sitio web.

## Abrir en Android Studio
1. *File → Open…* y elige la carpeta `mobile/` (no la raíz del repositorio).
2. Espera la sincronización de Gradle (descarga Gradle 9.9 y el SDK 37 si faltan).
3. Elige la configuración **androidApp** y pulsa ▶ (emulador o teléfono con depuración USB).

APK desde terminal: `./gradlew :androidApp:assembleDebug` → `androidApp/build/outputs/apk/debug/`.

## Qué hay en el teléfono y qué queda solo en la web
| En la app | Solo en la web |
|---|---|
| Ciudadano: reportar con GPS y fotos, ticket activo, mis reportes, calificar, perfil, llamar al 911 | Panel del operador (validar y despachar) |
| Cuadrilla: órdenes, cómo llegar, llamar a quien reportó, cerrar con foto | Gráficas, estadísticas y mapa de incidencias |
| Supervisión: ver como ciudadano o cuadrilla | Gestión del equipo y roles, páginas informativas |

## Estructura
- `shared/` — UI, lógica, red (Ktor) y sesión (Firebase REST, sin Google Play Services: funciona en cualquier Android).
  - `androidMain` / `iosMain` — GPS, cámara/galería, llamadas y mapas de cada plataforma.
  - `desktopTest` — pruebas de flujos contra una API simulada y capturas (`./gradlew :shared:desktopTest`).
- `androidApp/` — actividad, permisos e ícono.
- iOS: el módulo compila el framework `Shared`; falta crear el proyecto de Xcode en una Mac (`MainViewController()`).

Capturas en `docs/screenshots/`.
