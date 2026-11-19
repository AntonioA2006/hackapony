# Agua Alerta (hackapony)

MVP según `docs/`.

## Requisitos

- **Docker Desktop en ejecución** (motor Linux) para PostGIS
- Python 3.12+
- Node 20+

## Arranque rápido

```bash
# Abre Docker Desktop y espera a que el motor esté "running"
cp .env.example .env   # Windows: copy .env.example .env
docker compose up -d db
cd backend && alembic upgrade head
cd backend && python -m scripts.seed_dev
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
```

- API: http://localhost:8000/docs
- **Web equipo (nginx, LAN):** http://\<tu-IP\>:3080 — un solo puerto; API bajo `/api/v1`, docs en `/docs`
- Web (Docker local): http://localhost:3080 o http://localhost:8081
- Web (dev Vite): http://localhost:5173 — define `VITE_API_BASE_URL=http://localhost:8000/api/v1`

### Tiles del mapa

Sin variables, el mapa nacional usa Esri World Light Gray. Para otro proveedor define, antes de construir la imagen `web`:

```bash
VITE_MAP_TILE_URL=https://tiles.ejemplo/{z}/{x}/{y}.png
VITE_MAP_TILE_ATTRIBUTION=© Ejemplo
```

Van en el `.env` de la raíz (Docker) o en `frontend/.env.local` (`npm run dev`). También se aceptan `VITE_TILE_URL` y `VITE_TILE_ATTRIBUTION` si `VITE_MAP_TILE_*` no está definida. Un cambio exige `docker compose up -d --build web` o reiniciar Vite.

La imagen nginx toma Firebase de `frontend/.env.production`. Para sustituir esas claves públicas en el build, define `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` y `VITE_FIREBASE_APP_ID` en el `.env` de la raíz. Si no están, se conserva el archivo de producción. `npm run dev` sin esas variables sigue usando el login de la API.

Documentación detallada: [docs/11-infrastructure/local-network-setup.md](docs/11-infrastructure/local-network-setup.md).

### Pruebas en equipo (Windows)

Con Docker Desktop en marcha:

```powershell
.\scripts\team-up.ps1
```

Comparte la URL `http://10.x.x.x:3080` que imprime el script (misma red Wi‑Fi). Si el firewall bloquea, permite entrante TCP **3080**.

Usuarios de demo: `ciudadano@example.com` / `Ciudadano123!`, `admin@example.com` / `Admin12345!`, `super@example.com` / `Super12345!` (`team-up.ps1` ejecuta el seed; incluye incidencia **AA-LANDEM1** en el mapa).

Verificación rápida: `.\scripts\verify-lan.ps1`. Firewall (admin): `.\scripts\firewall-lan.ps1`.

**Mapa público:** solo incidencias con al menos un reporte **validado** por admin.

## Pruebas

```bash
cd backend && pytest tests/test_priority.py -q
```

INEGI E2E (wscatgeo en vivo): `.\scripts\inegi-e2e.ps1` — ver [docs/10-testing/inegi-e2e.md](docs/10-testing/inegi-e2e.md).