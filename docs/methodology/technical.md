# Referencia técnica — Aviation Weather Viewer

## Versiones fijadas

| Tecnología | Versión |
|---|---:|
| Python | 3.12 |
| Django | 6.0.5 |
| Django REST framework | 3.17.1 |
| psycopg / psycopg-binary | 3.3.4 |
| PostgreSQL | 16.14 local; 16 en CI |
| PostGIS | 3.4.2 local; imagen CI `postgis/postgis:16-3.4` |
| GDAL | 3.8.4 local |
| GEOS | 3.12.1 local |
| Next.js | 16.3.1 |
| React / React DOM | 19.2.6 |
| Zustand | 5.0.13 |
| MapLibre GL JS | 6.3.0 |

## Variables backend

Obligatorias:

- `DJANGO_SECRET_KEY`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`

Opcionales con default: `POSTGRES_PORT=5432`, `DJANGO_ENV=development`,
`DJANGO_DEBUG=true` y `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1`.

Django rechaza valores vacíos y placeholders conocidos. No existe fallback a
SQLite o MySQL.

## Variable frontend

- `NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:8000`: origen usado por el
  servidor Next.js para rewrites same-origin.

## Basemap local de Fase 01

- Cámara: `[-73.5, 4.5]`, zoom `4.7`, bearing/pitch `0`.
- Zoom permitido: `4–9`.
- Bounds regionales: `[[-84, -7], [-64, 16]]`.
- Style: `/map/style.json`.
- Web Worker MapLibre: `/map/maplibre-gl-worker.mjs`, fijado explícitamente
  para que Turbopack no tenga que inferirlo desde `import.meta.url`.
- GeoJSON: seis países regionales, costa recortada, 33 departamentos y 39
  labels.
- Glyphs: Noto Sans Regular, rango `0-255`.

IDs de source reservados:

```text
basemap-regional-countries
basemap-regional-coastline
basemap-colombia-departments
basemap-labels
```

IDs de layer reservados:

```text
basemap-background
basemap-regional-land
basemap-colombia-land
basemap-coastline
basemap-country-boundaries
basemap-department-boundaries
basemap-country-labels
basemap-department-labels
```

## PostGIS local validado

El host de trabajo usa el cluster PostgreSQL `16/main` en el puerto `5432`. La
base `aviation_weather` tiene habilitada la extensión `postgis`. Comandos de
diagnóstico:

```bash
pg_lsclusters
psql -d aviation_weather -c "SELECT PostGIS_Full_Version();"
gdalinfo --version
geos-config --version
```

Para conexiones TCP debe crearse una credencial local fuera de Git. Las pruebas
de esta fase pueden usar peer auth por socket Unix y una variable de password no
utilizada por PostgreSQL; CI usa credenciales efímeras explícitamente marcadas
como no secretas.

## Comandos dirigidos

```bash
cd backend && source venv/bin/activate && python manage.py check
cd backend && source venv/bin/activate && pytest weather/tests/test_health.py -v
cd frontend && npm test -- app/__tests__/page.test.tsx
cd frontend && npm test -- map/__tests__/WeatherMapController.test.ts
cd frontend && npm test -- lib/stores/__tests__/weatherViewerStore.test.ts
cd frontend && npm test -- components/weather/WeatherViewerShell/__tests__/WeatherViewerShell.test.tsx
```

El build se ejecuta en un ciclo separado:

```bash
cd frontend && npm run build
```

## Decisiones técnicas

- `APPEND_SLASH=False`; el health exacto no termina en `/`.
- DRF no registra autenticadores y usa `AllowAny`.
- `django.contrib.gis` y el backend PostGIS se cargan en todos los ambientes.
- MapLibre se importa solo desde el controller client-side y se construye una
  vez por montaje.
- El worker y su módulo compartido se copian sin modificar desde
  `maplibre-gl@6.3.0`; su licencia completa vive en `public/map/`.
- `trackResize` queda desactivado: el controller responde al window resize y el
  shell a `ResizeObserver`, ambos convergen en `map.resize()`.
- El store conserva estado serializable; nunca guarda mapa, cámara ni viewport.
- El tema usa únicamente los siete tokens `--viewer-*` del contrato.
