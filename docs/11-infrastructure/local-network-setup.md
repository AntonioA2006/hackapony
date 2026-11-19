# Pruebas en red local (LAN)

Guía para que el equipo acceda a Agua Alerta desde la misma Wi‑Fi sin ejecutar el backend en cada dispositivo.

## Requisitos

- Docker Desktop en la computadora **anfitriona** (o Python 3.12 + Node 20).
- Misma red Wi‑Fi; desactivar **aislamiento de clientes** en el router si impide ver otros equipos.
- Puertos en firewall de Windows (perfil **Privado**): **3080**, **5173**, **8000** según el modo de uso.

## Obtener la IPv4 en Windows (PowerShell)

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -eq 'Dhcp' } |
  Select-Object -First 1 -ExpandProperty IPAddress
```

Ejemplo de salida: `10.27.62.22` (tu IP será distinta; no la copies del docs).

## Modo recomendado para el equipo: Docker + nginx (puerto 3080)

Un solo puerto; el navegador llama a `/api/v1` en el **mismo host** (evita CORS y el error `Failed to fetch` por `localhost`).

```powershell
cd C:\ruta\hackapony
.\scripts\configure-lan.ps1   # opcional: Vite + CORS
.\scripts\team-up.ps1
```

| Quién | URL |
|-------|-----|
| Anfitrión | http://localhost:3080 |
| Otro PC / móvil | http://\<IPv4-anfitrión\>:3080 |
| API docs | http://\<IPv4\>:3080/docs |
| Salud | http://\<IPv4\>:3080/health |
| Listo (DB) | http://\<IPv4\>:3080/health/ready |

En `.env` de la raíz use `DOCKER_WEB_API_BASE_URL=/api/v1`. **No** ponga `VITE_API_BASE_URL=http://localhost:8000` ahí: Docker lo inyecta al build y rompe el acceso desde otros dispositivos.

## Modo desarrollo Vite (puerto 5173)

El servidor escucha en `0.0.0.0` (`vite.config.ts`).

```powershell
.\scripts\configure-lan.ps1
cd backend
# con DB Docker:
$env:DATABASE_URL="postgresql+psycopg://agua:agua_secret@localhost:5432/agua_alerta"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
cd ..\frontend
npm run dev
```

- Anfitrión: http://localhost:5173  
- Equipo: http://\<IPv4\>:5173  
- El frontend en LAN usa automáticamente `http://<IPv4>:8000/api/v1` (`getApiBase()` en `client.ts`).

Si define `VITE_API_BASE_URL` manualmente, use la IPv4 del anfitrión, **nunca** `localhost`, en `frontend/.env.local`.

## Variables de entorno

### Raíz `.env` (API + Docker Compose)

| Variable | Uso |
|----------|-----|
| `CORS_ORIGINS` | Lista CSV de orígenes explícitos (localhost + IP LAN con puertos). |
| `CORS_ORIGIN_REGEX` | Opcional; por defecto la API acepta orígenes en redes privadas 10.x, 192.168.x, 172.16–31.x. |
| `HOST` / `PORT` | Documentación; uvicorn en Docker ya usa `0.0.0.0:8000`. |
| `DOCKER_WEB_API_BASE_URL` | Siempre `/api/v1` para la imagen `web`. |

### `frontend/.env.local` (solo dev Vite, no commitear)

```env
VITE_API_BASE_URL=http://TU_IPV4:8000/api/v1
```

Ver `frontend/.env.example`.

## Firewall de Windows (PowerShell como administrador)

Solo red privada; no desactivar el firewall completo.

```powershell
New-NetFirewallRule -DisplayName "Agua Alerta nginx (3080)" -Direction Inbound `
  -Protocol TCP -LocalPort 3080 -Profile Private -Action Allow

New-NetFirewallRule -DisplayName "Agua Alerta API (8000)" -Direction Inbound `
  -Protocol TCP -LocalPort 8000 -Profile Private -Action Allow

New-NetFirewallRule -DisplayName "Agua Alerta Vite (5173)" -Direction Inbound `
  -Protocol TCP -LocalPort 5173 -Profile Private -Action Allow
```

## Causa habitual de `Failed to fetch` en el mapa

El componente `MapPage` llama `GET /incidents/public` vía `apiFetch`. El mapa Leaflet/OSM suele cargar bien; el fallo casi siempre es la **petición a la API**:

1. Bundle con `http://localhost:8000/api/v1` abierto desde otro dispositivo (`localhost` = ese dispositivo).
2. Vite en LAN sin CORS para `http://<IP>:5173`.
3. API apagada o puerto 8000 bloqueado por firewall.

Con nginx en **3080**, la API debe ser ruta relativa `/api/v1` o resolución automática en `getApiBase()`.

## Pruebas de conectividad

Desde **otro dispositivo** en la misma Wi‑Fi:

```powershell
# Desde el anfitrión
curl.exe http://TU_IPV4:3080/health
curl.exe http://TU_IPV4:3080/api/v1/incidents/public?page_size=5
```

En el móvil: abrir la URL en el navegador, ir a **Mapa**, comprobar que no aparece error de conexión.

Checklist equipo (manual):

- [ ] A: Frontend en anfitrión  
- [ ] B: `/health` y `/health/ready`  
- [ ] C–D: Reporte y mapa (incidencia visible tras validación admin)  
- [ ] E–G: Otro PC / móvil consulta incidencias  
- [ ] H: Reporte cruzado entre dispositivos  
- [ ] I: Subida de fotos  
- [ ] J: Mensajes de error legibles  

## PostgreSQL

En `docker-compose.yml`, Postgres publica solo en `127.0.0.1:5432` (no expuesto a toda la LAN).

## Scripts útiles

```powershell
.\scripts\team-up.ps1      # build + seed + verify
.\scripts\verify-lan.ps1   # health, mapa, CORS
.\scripts\configure-lan.ps1
.\scripts\firewall-lan.ps1 # requiere PowerShell admin (perfil Privado)
```

## Solución de problemas

| Síntoma | Acción |
|---------|--------|
| `Failed to fetch` en mapa | Verifique URL (3080), reconstruya `web`: `docker compose up -d --build web`, confirme que `.env` no fija `VITE_API_BASE_URL=localhost`. |
| Login OK en PC, falla en móvil | Use `:3080`, no `:8081` con build antiguo. |
| CORS en Vite LAN | Ejecute `configure-lan.ps1` o añada `http://<IP>:5173` a `CORS_ORIGINS`. |
| Mapa vacío sin error | Normal si no hay incidencias con reporte **validado**; valide en admin. |
| Tiles OSM no cargan | Red del dispositivo sin Internet o bloqueo de `tile.openstreetmap.org`. |