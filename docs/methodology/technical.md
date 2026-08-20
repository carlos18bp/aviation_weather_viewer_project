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

## CI de `backend-health`

El job usa un servicio efímero `postgis/postgis:16-3.4` y conserva un límite
global de 20 minutos. La preparación de GeoDjango separa la actualización de
índices APT de la instalación para que una espera externa sea identificable:

- actualización de índices: máximo 5 minutos;
- instalación de GDAL, GEOS y cliente PostgreSQL: máximo 10 minutos;
- tres reintentos por descarga y timeout HTTP/HTTPS de 30 segundos;
- salida APT visible y ejecución no interactiva.

Después de preparar el sistema, el job instala `requirements.txt`, verifica
PostGIS, ejecuta `manage.py check` y corre únicamente
`weather/tests/test_health.py`.

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

## Runtime y validación de Fase 08

- URL: `https://aviation-weather-platform.projectapp.co`.
- Backend: `aero-meteo-mvp.socket/service` sobre Gunicorn.
- Frontend: `aviation-weather-viewer-frontend.service`, puerto interno `3002`.
- TLS: certificado Let's Encrypt con CN exacto del dominio.
- Base staging: `aviation_weather`; template PostGIS aislado para pytest:
  `aviation_weather_template`.
- Browsers validados a `1920×1080`: Chrome 147 y Edge 151.
- Host de medición: 1 vCPU, ANGLE/Vulkan SwiftShader; no representa una GPU
  física del equipo de reunión.
- Release QA integrado: PR #13, SHA desplegado y verificado
  `054ebdd27b459ba24cff3d65f580ea7bbae95f0d`.
- El spec live conserva aserciones estrictas y usa 60 s únicamente para el
  bootstrap/reload de MapLibre; el recorrido completo sigue acotado por
  `test.slow()`.
- Metadata fleet publicada: toolkit SHA
  `b0f2a244f99f2477bd828b69a45c8296e38a4d35`; schema 24/24, integridad 72/72,
  roster 9/9, doc-claims 15/15, parity y 94 units systemd verdes en local.
- El run remoto `32328692139` terminó sin asignar runner (`runner_id=0`, sin
  steps). Su anotación exige corregir payments/spending de GitHub; no representa
  un fallo del código ni puede convertirse en verde desde el repositorio.

Comandos de release dirigidos:

```bash
cd backend && source venv/bin/activate && python manage.py check
cd backend && source venv/bin/activate && pytest weather/tests/test_api.py -v
cd frontend && npm test -- features/viewer/__tests__/ViewerOrchestrator.test.ts --runInBand
cd frontend && npm run build
cd frontend && PLAYWRIGHT_BASE_URL=https://aviation-weather-platform.projectapp.co npx playwright test e2e/weather-viewer-demo.spec.ts --project="Desktop Chrome"
```

La evidencia manual y los comandos de contingencia viven en
`docs/release/phase08-demo-handoff.md`.

## Contratos frontend de Fase 09

- `searchAirports()` normaliza espacios, casing y diacríticos; prioriza código
  exacto, prefijo y texto parcial conservando el orden canónico en empates.
- `fetchAirportWeatherSeries()` reutiliza el endpoint individual para los seis
  timestamps, valida serie completa y aborta el lote ante un fallo.
- `useAirportWeatherSeries()` cachea por ICAO durante la vida del hook y
  descarta respuestas de selecciones obsoletas.
- `AirportSearch` y `AirportTrend` reciben selección/timestamp por props y solo
  emiten callbacks.

Verificación dirigida: 18 tests de búsqueda/componente, 16 de servicio/cache y
7 de tendencia. El lint se ejecuta solo sobre los módulos de Fase 09.

## Contrato técnico — Fase 10

- Manifiesto: schema `2`, doce frames originales y `overlays: []`.
- Valores térmicos: seis JSON `128×160`, row-major norte-sur/oeste-este, rango
  `0–38 °C`, bajo `temperature-values/`.
- API: `value_data_url` existe sólo para frames de temperatura; viento conserva
  su descriptor anterior.
- Exports públicos: `isCoordinateInsideCoverage`, `sampleScalarGrid` y
  `sampleWeatherAtCoordinate` desde `frontend/features/weather/picker`.
- IDs MapLibre reservados: `weather-picker-source` y `weather-picker-point`.
- Cache: timestamp activo más anterior/siguiente; abort y versión de request
  impiden publicar respuestas tardías.
- El manifiesto de aeropuertos conserva schema `1`; su versión es independiente
  de la versión del manifiesto meteorológico.

## Contratos técnicos de Fase 11

- Playback: `1500 ms`; fade-out: `120 ms`; fade-in: `180 ms`; reduced motion
  elimina únicamente esas esperas decorativas.
- Cache: una instancia por producto, máximo tres keys, promesas deduplicadas,
  `retain()` abortable y fallos de precarga no persistidos.
- URL: orden `layer,t,lat,lon,z,airport,picker,route,isobars,mode`; lat/lon y
  picker usan dos decimales, zoom uno, defaults se omiten.
- Viewport: sólo `moveend` debe llamar el debounce de `250 ms`; el helper usa
  `history.replaceState` y conserva pathname/hash.

Pruebas dirigidas de la fase viven en `features/timeline`,
`features/presentation`, `PresentationMode`, `SceneShare` y `Timeline`. No se
crean flows E2E ni se modifica el wiring central antes de Fase 14.

## Evidencia dirigida — Gate de la ola E1

- Fase 09: `41/41` tests — búsqueda/componente `18`, servicio/hook `16` y
  tendencia `7`.
- Fase 10 frontend: `41/41` tests — schema/sampler `20`, panel `6` y
  servicio/adapter `15`.
- Fase 10 backend: `58/58` tests — assets en batches `17 + 16 + 3`, API
  `18 + 3` y reproducibilidad byte a byte `1`.
- Fase 11: `99/99` tests — preloader/transición `14`, timeline `18`, selección
  de escena `18`, codec base `15`, airport/URL/harness `15` y controles `19`.
- ESLint dirigido: PR #16, #18 y #17 sin findings; `python manage.py check`
  sin issues; `npm run build` compiló y generó las tres páginas estáticas.

El manifiesto schema 2 conserva SHA-256
`8ad5fc27b9963a89b0dc7fa42187071ecc42bf4a4f8dd1be4ffa5f63bf1687e8`.
Los seis grids conservaron los hashes registrados en `tasks/active_context.md`.
La inspección de diffs no encontró manifests de dependencias, URLs runtime
externas ni datos no simulados. No se ejecutó la suite completa ni QA E2E:
estas funciones permanecen aisladas hasta Fase 14.
