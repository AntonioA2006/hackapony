# Agua Alerta

Plataforma para reportar fugas de agua, seguir el folio y cerrar el caso con evidencia.

**Página:** [https://agua-alerta-mx.web.app/](https://agua-alerta-mx.web.app/)

Quien reporta ve el estado. Un operador valida. Una cuadrilla repara y explica. El operador confirma y las fotos se borran.

## Quién entra y qué hace

| Rol | Para qué entra |
| --- | --- |
| Ciudadano | Reporta donde está, sigue su folio y contesta la encuesta cuando el caso queda resuelto |
| Operador | Valida reportes, asigna a la cuadrilla y confirma el cierre |
| Cuadrilla | Atiende la orden, sube la foto de la reparación, la explicación y el tiempo |
| Supervisión | Cambia de vista (ciudadano, operador o cuadrilla) y administra el equipo |

En el celular, el menú de hamburguesa cambia con el rol:

- **Ciudadano:** Tablero, Estadísticas, Sobre nosotros, Sesión y Cerrar sesión.
- **Operador:** Sobre nosotros, Cambiar de sesión y Cerrar sesión. El panel sigue en la barra.
- **Cuadrilla:** Inicio, Sobre nosotros, Cuenta y Cerrar sesión. Las órdenes siguen en la barra.

## Arranque

Hace falta Docker con PostGIS, Python 3.12+ y Node 20+.

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api python -m scripts.seed_dev
```

- Equipo en la red: `http://<tu-IP>:3080`
- Esta máquina: `http://localhost:3080`
- API: `http://localhost:8000/docs`

Sin el modo de desarrollo del override:

```bash
docker compose -f docker-compose.yml up -d --build
```

Si cambias una migración: `docker compose run --rm migrate`.

### En la máquina, sin el contenedor de la web

```bash
cd backend && alembic upgrade head && python -m scripts.load_inegi_seed
cd backend && python -m scripts.seed_dev
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
```

La web de desarrollo queda en `http://localhost:5173`. En `frontend/.env.local`, `VITE_API_BASE_URL=http://localhost:8000/api/v1`. Sin claves de Firebase, el login es el de la API.

Usuarios de demostración que crea el seed: `ciudadano@example.com` / `Ciudadano123!`, `admin@example.com` / `Admin12345!`, `super@example.com` / `Super12345!`.

## Mapa

Sin variables, el mapa usa Esri World Light Gray. Otro proveedor:

```bash
VITE_MAP_TILE_URL=https://tiles.ejemplo/{z}/{x}/{y}.png
VITE_MAP_TILE_ATTRIBUTION=© Ejemplo
```

El mapa público solo muestra incidencias con un reporte ya validado, y la coordenada está aproximada. El personal ve el punto real, también lo que aún no se valida.

## Más documentación

- [Puesta en marcha en red local](docs/11-infrastructure/local-network-setup.md)
- [Despliegue](docs/11-infrastructure/free-deployment.md)
- Pruebas de prioridad: `cd backend && pytest tests/test_priority.py -q`
