# Agua Alerta

Plataforma para reportar fugas de agua, seguir el folio y cerrar el caso con evidencia. Funciona en la web y en una app móvil nativa para Android (con base lista para iOS).

**Página:** [https://agua-alerta-mx.web.app/](https://agua-alerta-mx.web.app/) · **App Android:** [GitHub Releases](../../releases) (archivo `agua-alerta-<versión>.apk`)

Quien reporta ve el estado. Un operador valida. Una cuadrilla repara y explica. El operador confirma y las fotos se borran.

## Qué hay en este repositorio

| Carpeta | Qué es | Tecnología |
| --- | --- | --- |
| `backend/` | API, migraciones y datos INEGI | FastAPI, SQLAlchemy, Alembic, PostgreSQL + PostGIS |
| `frontend/` | Sitio web (ciudadanía, operador, cuadrilla y supervisión) | React 19, Vite, Tailwind, Leaflet, React Query |
| `mobile/` | App nativa Android / iOS | Kotlin Multiplatform, Compose Multiplatform, Ktor |
| `docs/` | Requisitos, arquitectura, API, seguridad, despliegue | Markdown |
| `scripts/` | Utilidades de red local en Windows (PowerShell) | — |

La web y la app usan la misma API y las mismas cuentas de Firebase Authentication.

## Quién entra y qué hace

| Rol | En la web | En la app móvil |
| --- | --- | --- |
| Ciudadano | Reporta, sigue su folio, mapa, estadísticas y encuesta de satisfacción | Reporta con GPS y fotos, ticket activo, mis reportes, calificar, llamar al 911 |
| Operador | Valida reportes, asigna cuadrilla y confirma el cierre (colas "Por validar" y "Por verificar") | Solo en la web |
| Cuadrilla | Atiende la orden y la cierra con foto, explicación y tiempo empleado | Órdenes, cómo llegar, llamar a quien reportó, cerrar con foto |
| Supervisión | Cambia de vista (ciudadano, operador o cuadrilla), panel con gráficas y gestión del equipo | Ver como ciudadano o cuadrilla |

En el celular, el menú de hamburguesa de la web cambia con el rol:

- **Ciudadano:** Tablero, Estadísticas, Sobre nosotros, Sesión y Cerrar sesión.
- **Operador:** Sobre nosotros, Cambiar de sesión y Cerrar sesión. El panel sigue en la barra.
- **Cuadrilla:** Inicio, Sobre nosotros, Cuenta y Cerrar sesión. Las órdenes siguen en la barra.

## Cómo se atiende un reporte

1. La persona reporta (ubicación, categoría, gravedad, caudal y fotos). Los reportes cercanos se agrupan en una incidencia.
2. La prioridad suma gravedad, caudal, corroboración, población afectada y tiempo abierta. Una fuga crítica o una inundación nunca queda por debajo de "alta".
3. El operador valida o rechaza. Al rechazar, las fotos de ese reporte se borran.
4. Con un reporte validado, el operador asigna una cuadrilla.
5. La cuadrilla cierra con foto, explicación y minutos empleados. Quien reportó ya lo ve como resuelto; la foto solo la ve el personal.
6. El operador confirma el cierre y se borran todas las fotos del caso.

El mapa público solo muestra incidencias con un reporte validado y con la coordenada aproximada (~30 m). El personal ve el punto real, también lo que aún no se valida.

## Arranque de la web y la API

Hace falta Docker (con Compose), o bien PostgreSQL con PostGIS, Python 3.12 y Node 22.

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api python -m scripts.seed_dev
```

- Equipo en la red: `http://<tu-IP>:3080`
- Esta máquina: `http://localhost:3080`
- API: `http://localhost:8000/docs`

Sin el modo de desarrollo del override: `docker compose -f docker-compose.yml up -d --build`. Si cambias una migración: `docker compose run --rm migrate`.

### Sin contenedores

```bash
cd backend && pip install -r requirements.txt
alembic upgrade head && python -m scripts.load_inegi_seed && python -m scripts.seed_dev
uvicorn app.main:app --reload --port 8000

cd frontend && npm ci && npm run dev
```

La web de desarrollo queda en `http://localhost:5173`. En `frontend/.env.local`, `VITE_API_BASE_URL=http://localhost:8000/api/v1`. Sin claves de Firebase, el login es el de la API.

Usuarios de demostración que crea el seed: `ciudadano@example.com` / `Ciudadano123!`, `admin@example.com` / `Admin12345!`, `super@example.com` / `Super12345!`.

### Mapa

Sin variables, el mapa usa Esri World Light Gray. Otro proveedor:

```bash
VITE_MAP_TILE_URL=https://tiles.ejemplo/{z}/{x}/{y}.png
VITE_MAP_TILE_ATTRIBUTION=© Ejemplo
```

## App móvil

Requiere JDK 17 o superior y el SDK de Android (Android Studio lo instala). La app apunta a la API de producción (`mobile/shared/src/commonMain/kotlin/mx/aguaalerta/AppConfig.kt`).

```bash
cd mobile
./gradlew :shared:desktopTest           # pruebas de flujos y capturas, sin emulador
./gradlew :androidApp:assembleDebug     # APK en androidApp/build/outputs/apk/debug/
```

En Android Studio: *File → Open…* sobre la carpeta `mobile/` y ejecuta la configuración **androidApp**. Funciona en Android 7.0 o superior, sin Google Play Services. Para iOS, el módulo genera el framework `Shared`; falta crear el proyecto de Xcode en una Mac. Más detalle en [mobile/README.md](mobile/README.md).

### Versiones de la app

La versión vive en [`mobile/version.properties`](mobile/version.properties) (`versionName` la ve la gente y `versionCode` siempre debe crecer). Para publicar una versión:

```bash
# 1. sube versionName y versionCode en mobile/version.properties y haz merge a main
git tag mobile-v1.0.1 && git push origin mobile-v1.0.1
```

El workflow **App móvil** publica en GitHub Releases el APK de esa versión y el framework de iOS. Para que el APK de release salga firmado, agrega estos secretos en *Settings → Secrets and variables → Actions*: `ANDROID_KEYSTORE_BASE64` (el `.jks` en base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`. Sin ellos se publica solo el APK de depuración.

## GitHub Actions

| Workflow | Cuándo corre | Qué hace |
| --- | --- | --- |
| `ci.yml` | Push y PR a `main` | Pruebas del backend con PostGIS; pruebas y build de la web |
| `mobile.yml` | Push y PR que tocan `mobile/`, tags `mobile-v*` o manual | Pruebas de la app, APK con la versión en el nombre, framework de iOS en macOS y, con tag, GitHub Release |
| `keepalive.yml` | Cada 10 min | Mantiene despierta la API del plan gratuito de Render |

## Despliegue

- **API:** Render, con despliegue automático desde `main` ([`render.yaml`](render.yaml)). Al arrancar aplica las migraciones.
- **Web:** Firebase Hosting: `npm run build` en `frontend/` y, desde la raíz, `firebase deploy --only hosting --project agua-alerta-mx`.
- **App Android:** GitHub Releases con el tag `mobile-v<versión>`.

## Más documentación

- [Índice de la documentación](docs/README.md)
- [Puesta en marcha en red local](docs/11-infrastructure/local-network-setup.md)
- [Despliegue gratuito](docs/11-infrastructure/free-deployment.md)
- [Variables de entorno](docs/11-infrastructure/environment-variables.md)
- Pruebas de prioridad: `cd backend && pytest tests/test_priority.py -q`
