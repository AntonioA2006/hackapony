# Arquitectura frontend

## Estructura de carpetas propuesta

```text
frontend/
├── public/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── routes.tsx
│   │   └── providers.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── PublicMapPage.tsx
│   │   ├── ReportCreatePage.tsx
│   │   ├── MyReportsPage.tsx
│   │   ├── CitizenDashboardPage.tsx
│   │   └── admin/
│   │       ├── AdminDashboardPage.tsx
│   │       ├── IncidentsMapPage.tsx
│   │       └── IncidentDetailPage.tsx
│   ├── features/
│   │   ├── auth/
│   │   ├── reports/
│   │   ├── incidents/
│   │   └── notifications/
│   ├── shared/
│   │   ├── api/
│   │   ├── map/
│   │   └── ui/
│   └── styles/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

## Enrutamiento (borrador)

| Ruta | Vista | Auth |
|------|-------|------|
| `/` | Landing + acceso mapa | No |
| `/mapa` | Incidencias públicas | No |
| `/reportar` | Formulario reporte | Sí |
| `/mis-reportes` | Lista propia | Sí |
| `/tablero` | Dashboard ciudadano | Sí |
| `/admin` | Dashboard admin | Admin |
| `/admin/incidencias/:id` | Detalle | Admin |

## Estado

- **React Query** (propuesta justificada: caché, reintentos) para datos servidor.
- Contexto auth para tokens y refresh.

## Mapa

- Base OSM: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` (política de atribución OSM).
- Capas: incidencias (markers/cluster), pin de reporte en edición.

Especificación UX: [../08-frontend/map-specification.md](../08-frontend/map-specification.md).