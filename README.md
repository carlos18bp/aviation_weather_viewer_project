# Aviation Weather Viewer

MVP demostrativo de un visor de meteorología aeronáutica para Colombia. Todos
los datos previstos para la demo son simulados, determinísticos y no aptos para
uso operacional.

La Fase 00 entrega una base mínima: un placeholder fullscreen con la dirección
visual definitiva, un health público y configuración PostgreSQL/PostGIS. El
mapa, aeropuertos, assets meteorológicos, viento, temperatura y timeline se
incorporan en fases posteriores.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12, Django 6.0.5, DRF 3.17.1 |
| Base de datos | PostgreSQL 16 + PostGIS 3.4 |
| Frontend | Next.js 16.3.1, React 19.2.6, TypeScript |
| Estado / mapa | Zustand 5.0.13, MapLibre GL JS 6.3.0 |

## Inicio local

### Backend

Instala PostgreSQL 16, PostGIS, GDAL y GEOS; crea una base con la extensión
`postgis`, y luego:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Reemplaza todos los placeholders de .env.
python manage.py check
python manage.py runserver 127.0.0.1:8000
```

Variables requeridas: `DJANGO_SECRET_KEY`, `POSTGRES_DB`, `POSTGRES_USER`,
`POSTGRES_PASSWORD` y `POSTGRES_HOST`. `POSTGRES_PORT` usa `5432` por defecto;
`DJANGO_ENV`, `DJANGO_DEBUG` y `DJANGO_ALLOWED_HOSTS` controlan el ambiente.

El health queda disponible exactamente en `GET /api/v1/health`.

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`. Next.js reescribe `/api/*` y `/media/*` hacia
`NEXT_PUBLIC_BACKEND_ORIGIN` sin exponer credenciales al navegador.

## Verificación de Fase 00

```bash
cd backend && source venv/bin/activate && python manage.py check
cd backend && source venv/bin/activate && pytest weather/tests/test_health.py -v
cd frontend && npm test -- app/__tests__/page.test.tsx
```

El build se ejecuta aparte con `cd frontend && npm run build`.

Los contratos vigentes están en
`docs/MVP_roadmap/phase_scopes/00_shared_contracts.md`; el alcance de esta fase,
en `docs/MVP_roadmap/phase_scopes/01_phase_00_cleanup_visual_freeze.md`.
