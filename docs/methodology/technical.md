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

## Contrato técnico — Fase 12

- Radio terrestre Haversine: `3440.065 NM`; exactamente `24` muestras,
  incluyendo ambos extremos, interpoladas sobre gran círculo.
- Convención: U positivo al este, V positivo al norte,
  `alongWindKt > 0` cola, `alongWindKt < 0` frente y `crossWindKt` conserva su
  signo; sólo los DTO visibles se redondean.
- El análisis puro reutiliza `parseWindField()` y `sampleWindField()` del
  renderer público de viento, con validación previa de cobertura.
- IDs MapLibre: `weather-route-source`, `weather-route-line` y
  `weather-route-samples`; colores de segmentos cola `#22d3ee`, frente
  `#fb7185` y neutral `#cbd5e1`.
- Exports públicos: validación y tipos de ruta, geodesia, `analyzeRoute`,
  conversión GeoJSON, `RouteLayerAdapter`, `RoutePlanner` y `RouteProfile`.
- Verificación dirigida: 39 tests de dominio, GeoJSON, adapter y componentes;
  quality gate acotado `100/100`, ESLint del ownership y build Next verdes. No
  se ejecutó la suite completa.

## Contratos planificados — Fases 15–23

- Viewports: phone 360–767 px, tablet 768–1199 px y desktop desde 1200 px.
- Safe areas: viewport-fit=cover, 100dvh y env(safe-area-inset-*).
- Touch target: 44×44 CSS px; tap válido hasta 500 ms y 8 px de movimiento.
- Partículas: phone 900, tablet 1600, desktop 2500; degradación única al 60 %
  si el promedio permanece bajo 24 FPS durante tres segundos.
- Capas nuevas: cloud-cover 0–100 %, cloud-base 300–15000 ft AGL/null,
  visibility 1–20 km y wind-gusts 0–80 kt.
- Assets nuevos: 24 WebP RGBA 1024×1216 y 24 grids JSON 128×160.
- Manifest final: schema 3, siete capas, 42 frames principales y seis frames de
  pressure-isobars.
- Fase 18 mantiene assets staged; Fase 23 publica manifest, API y parser
  frontend de forma atómica.

La especificación exacta vive en
docs/MVP_roadmap/mobile_layer_enrichment/00_shared_contracts.md.

## Contrato técnico — Fase 13

- Manifiesto: schema `2`, 18 frames principales y un overlay con seis frames.
- Precipitación: seis WebP RGBA `1024×1216`, bbox `[-82,-5,-66,14]`, rango
  global `0–40 mm/h` y opacidad fija MapLibre `0.68`.
- Paleta: `0 #00000000`, `0.5 #69d2e7`, `2 #2b8cbe`, `8 #41ab5d`,
  `15 #f0e442`, `25 #f28e2b`, `40 #d73027`.
- Isobaras: seis `FeatureCollection<LineString>` con niveles `996`, `1000`,
  `1004`, `1008`, `1012`, `1016`, `1020` y `1024 hPa`; todas las features
  conservan timestamp y flags de simulación/no operación.
- API: no hay endpoints nuevos. El catálogo publica la tercera capa y el
  overlay; `/frames` publica precipitación y mantiene `value_data_url`
  exclusivamente para temperatura.
- IDs MapLibre: `weather-precipitation-source`,
  `weather-precipitation-layer`, `weather-pressure-isobars-source`,
  `weather-pressure-isobars-lines` y `weather-pressure-isobars-labels`.
- Exports para Fase 14: `PRECIPITATION_LEGEND`,
  `fetchPrecipitationFrame`, `PrecipitationLayerAdapter`,
  `fetchIsobarCatalog`, `selectIsobarFrame` e `IsobarLayerAdapter`, además de
  sus factories, IDs y callbacks `onError(error, frame)`.

La generación doble y el test de reproducibilidad confirmaron igualdad byte a
byte. Los tests dirigidos de Fase 13 cubren assets/validadores, catálogo/frames,
schemas/servicios, respuestas obsoletas, hide-during-fetch, fallbacks y cleanup;
ESLint, Ruff, `python manage.py check` y el build Next quedaron verdes.

## Contrato técnico — Fase 14

- Estado serializable nuevo: `selectedCoordinate`, `selectedRoute`,
  `isobarsVisible`, `presentationMode` y `mapViewport`.
- API del controller: `setSelectedCoordinate`, `setRoute`,
  `setIsobarsVisible`, `setViewport`, callback de coordenada y callback
  `moveend`.
- Capas principales exclusivas: `wind`, `temperature`, `precipitation`;
  `pressure-isobars` no participa de esa exclusión.
- URL canónica: parse antes de bootstrap, validación por bbox/ICAO/timestamp,
  viewport sin animación, `history.replaceState` y actualización de cámara sólo
  después de `moveend`.
- Carga temporal: fetch de producto principal y dependencias visibles del mismo
  timestamp, preparación/decodificación raster previa al fade-out, fade-out
  `120 ms`, commit único, fade-in `180 ms` y precarga abortable de
  anterior/siguiente. Cada producto raster conserva como máximo una imagen
  preparada fuera de Zustand.
- Picker: un grid térmico y un campo U/V del mismo timestamp; muestreo local,
  sin endpoint nuevo y con estados distintos para fuera de cobertura y dato no
  disponible.
- Ruta: exactamente 24 muestras del U/V activo, origen/destino controlados,
  perfil compacto y disclaimer no operacional.
- Reset: abort de requests/precargas, stop de playback/transición, limpieza de
  selecciones y errores, reset de adapters/cámara, salida de presentación y
  carga canónica `wind/06Z`.
- E2E permitidos: `weather-enrichment-discovery.spec.ts` y
  `weather-enrichment-route-scene.spec.ts`; los errores permanecen en pruebas
  unitarias/integration dirigidas.

Evidencia visual local: Chrome y Edge reales a `1920×1080`, modo normal y
presentación, tres capas principales y escena simultánea aeropuerto + picker +
ruta. El host usa SwiftShader sin GPU física; el fallback estático de viento se
midió a `60.1 FPS`. La estabilidad recorrió `614.5 s`, terminó en reset y dejó
cero errores de consola/page y cero requests pendientes.

Evidencia dirigida previa a QA: TypeScript, ESLint del diff y build Next verdes;
recorrido Fase 08 `1/1` y los dos E2E enriquecidos `2/2`. La auditoría estática
registra 21 flujos: 8 cubiertos, 13 exentos, 0 missing, 0 partial y 0 junk-only.

QA final: gate `🟢` con 0 errores/warnings, store 15/15, route-scene live 1/1 y
Auditor KEEP para los 12 archivos de test modificados. El único rojo intermedio
fue infraestructura local: Django con `DJANGO_DEBUG=false` no registró `/media`;
al reiniciar el dev server con `true`, el mismo E2E pasó sin cambios productivos.

## Contrato técnico — Fase 15

- Media queries: phone `(max-width: 767px)` o landscape corto
  `(max-width: 1199px) and (max-height: 500px)`; tablet
  `(min-width: 768px) and (max-width: 1199px)` fuera del caso corto; desktop es
  el fallback desde `1200 px`. Orientación se resuelve por media query, sin UA.
- Layouts: `phone-sheet`, `phone-drawer`, `tablet-overlay`,
  `tablet-sidebar` y `desktop`. El drawer phone no supera `42vw`; ambos layouts
  tablet miden exactamente `320 px`.
- Snap del sheet: `peek` hasta `156 px`, `half` al `52 %` del stage y `full` al
  `100 %`. Contraer, expandir y cerrar siempre tienen botones de `44×44 px`; no
  existe una operación disponible únicamente mediante drag.
- Chrome persistente: warning, UTC y timeline quedan fuera del panel responsive.
  En phone el timeline conserva transporte y revela sus seis horas mediante el
  botón `Horas`.
- Identidad estable: una regresión unitaria verifica una sola creación de
  controller ante cambios de host; Playwright compara por igualdad estricta el
  root `.maplibregl-map`, el canvas y el contexto WebGL tras cada resize.

Validación dirigida: 46 pruebas unitarias de viewport/host/shell/timeline/
acciones/aeropuerto; dos E2E desktop de Fase 14; dos E2E responsive; TypeScript
y build Next verdes. Viewports cubiertos: `390×844`, `844×390`, `768×1024`,
`1024×768` y `1920×1080`. Capturas reproducibles:
`frontend/test-results/phase15-390x844.png`, `phase15-844x390.png`,
`phase15-768x1024.png` y `phase15-1024x768.png`.

## Contrato técnico — Fase 20

- Base común Ola M2: `8180ff0bdcdee6fc99b64461d7bc7878de9bc02c`.
- Visibility: `1–20 km`, un decimal, IDs `weather-visibility-source` y
  `weather-visibility-layer`, opacidad fija `0.62`.
- Wind gusts: raster escalar `0–80 kt`, un decimal, IDs
  `weather-wind-gusts-source` y `weather-wind-gusts-layer`, opacidad fija
  `0.66`; no crea particles ni altera U/V.
- Services: descriptor inyectado y estricto, fetch same-origin abortable,
  cache LRU configurable `1 | 2 | 3`, protección por request-version y object
  URL revocada en eviction, supersession o destroy.
- Fallos: grid inválido devuelve raster con `grid=null`; raster nuevo inválido
  rechaza el cambio; abort no se convierte en error visible.
- Muestreo: bilinear público de Fase 18; gust compara el `WindField` del mismo
  timestamp/coordenada con tolerancia `WIND_GUST_ROUNDING_TOLERANCE_KT=0.1`.
  Toda incoherencia devuelve `Valor no disponible`.
- Verificación: 49/49 tests dirigidos, TypeScript, ESLint del ownership y build
  Next de producción verdes. Guardas estáticas confirman cero imports a
  `WindRenderer`/Fase 19 y cero fetch en samplers.

Muestras staged verificadas en SKBO `[-74.1469, 4.70159]`: a 06Z,
visibilidad `8.6 km`, ráfaga `14.4 kt` y viento `11.2 kt`; a 09Z,
visibilidad `8.4 km`, ráfaga `10.2 kt` y viento `8.1 kt`. Ambas muestras son
coherentes sin aplicar corrección.

Capturas aisladas inspeccionadas: `/tmp/phase20-visibility-06Z.png`,
`/tmp/phase20-visibility-09Z.png`, `/tmp/phase20-wind-gusts-06Z.png` y
`/tmp/phase20-wind-gusts-09Z.png`.

## Contrato técnico — Fase 23

- Base de integración: `662668292acc3236270c4633f069102d5a9c1d9c`.
- Manifest: schema 3, siete layers, 42 frames principales, un overlay con seis
  frames y seis timestamps exactos.
- Assets nuevos: 48 archivos, 3.360.836 bytes y hashes SHA-256 congelados en
  `MOBILE_LAYER_ASSET_SHA256`. El command `--check` valida bytes, dimensión,
  schema, rangos, timestamps y coherencia gust-viento.
- API: layer/timestamp inválido 400; traversal, missing, hash distinto o asset
  corrupto 503 `asset_unavailable`; URLs sólo same-origin.
- `WeatherLayerId` contiene siete literales. Parser rechaza catálogo parcial,
  duplicados, flags falsos, reglas de grid inválidas y descriptor cruzado.
- El frame service separa raster obligatorio de grid parcial y combina los
  services públicos de Fases 19/20 sin duplicarlos.
- El scene codec serializa los siete IDs y canonicaliza desconocidos a `wind`.
  Panel, orientación y `WindRenderProfileId` no pertenecen a la escena.
- Registry: adapters de cloud cover/base/visibility/gust se instancian una vez;
  wind recibe callbacks adaptativos mediante su opción pública de renderer.
- Orquestador: transición versionada, abortable y atómica; mantiene el último
  frame confirmado ante falla y nunca publica datos de otra hora.
- Reset: aborta transición/precargas, pausa playback, limpia derivados, resetea
  adapters/cámara y carga `wind/06Z` con URL canónica.
- Responsive integrado corrige la clasificación de tablet coarse después de
  rotación usando dimensiones físicas; no recrea controller/MapLibre.

Validación de integración: backend dirigido verde, 260 tests
frontend en batches de máximo 20, TypeScript verde, ESLint sin errores tras
retirar un click E2E forzado, matriz C/D Chrome+WebKit verde y recorridos desktop
vigentes verdes. El flow map registra 30 flujos, 13 cubiertos y 17 exentos, sin
partial/missing/junk en la auditoría estática completa.

QA formal: quality gate estricto 100/100 y sin findings; auditoría de 14
archivos/123 tests con 123 `KEEP`; matriz móvil/tableta Chrome+WebKit y journeys
responsive/desktop verdes. No existe tooling de mutation testing configurado.
El build posterior, ejecutado como ciclo separado, compiló con Next.js 16,
validó TypeScript y generó tres páginas estáticas.

Soak Chromium headless 360×800/DPR 1: 600,380 s, 54,54 FPS promedio, mínimo 4
durante la carga que activa `degraded`, heap 15.678.472→52.068.940→20.157.460,
listeners 689→1.283→693, cuatro object URLs estables, una canvas, cero crashes,
cero page errors y cero requests externas. El único 503/console error fue
inducido para validar fallback. Evidencia en
`docs/release/phase23-stability-chromium.json`.

El despliegue no forma parte de esta ejecución por instrucción del operador. La
validación física de iPhone/Safari y Android/Chrome queda pendiente y no puede
ser sustituida por Playwright WebKit.
