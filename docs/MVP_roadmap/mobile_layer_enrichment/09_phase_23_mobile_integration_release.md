# Fase 23 — Integración móvil, QA y release

## Objetivo

Conectar las entregas de Fases 15–22 en un vertical slice único, publicar
manifest schema 3 y demostrar una experiencia estable en teléfono, tableta y
desktop. Esta fase integra; no reimplementa módulos.

## Ola y dependencias

- **Ola:** M3 cierre, secuencial.
- **Requiere:** Fases 15–22 integradas y Gates M1/M2 verdes.
- **Desbloquea:** nueva demo móvil desplegada.
- **Requerimientos:** MRF-012, MRF-013 y MRNF-001 a MRNF-010.
- **No comienza:** mientras exista un PR M1/M2 sin integrar.

## Resultado demostrable

En teléfono:

1. abrir default wind 06Z;
2. abrir capas y seleccionar cloud-cover;
3. tocar una coordenada y ver resumen/evolución;
4. seleccionar visibility, elegir 09Z y reproducir timeline;
5. buscar aeropuerto y crear ruta;
6. activar isobaras;
7. rotar landscape sin perder escena;
8. copiar/restaurar URL;
9. resetear a wind 06Z.

En tableta/desktop repetir selección de capas, punto, ruta y timeline con la
composición correspondiente.

## Ownership temporal de integración

~~~text
backend/weather/demo/constants.py
backend/weather/demo/generation.py
backend/weather/demo/validators.py
backend/weather/demo/loaders.py
backend/weather/views.py
backend/weather/tests/test_assets.py
backend/weather/tests/test_api.py
backend/media/demo-weather/demo-colombia-001/manifest.json
frontend/features/viewer/**
frontend/lib/services/weatherService.ts
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/features/presentation/**
frontend/components/weather/WeatherViewerShell/**
frontend/e2e/**
docs/USER_FLOW_MAP.md
docs/release/**
~~~

Puede retirar el selector/leyenda anterior únicamente después de conectar sus
reemplazos y actualizar tests.

## Preflight obligatorio

1. verificar SHA común de las ocho fases;
2. revisar handoffs, exports, IDs, hashes y riesgos;
3. confirmar 48 assets con command --check;
4. confirmar que desktop de Fase 14 está verde antes del wiring;
5. registrar captura/FPS/heap base;
6. congelar lista de puntos centrales que solo esta fase editará.

## Integración backend

### Schema 3 atómico

- extender layer definitions con category y supports_point_value;
- incorporar cuatro capas y 24 frame descriptors nuevos;
- exigir value_data_path en temperature y cuatro capas nuevas;
- conservar prohibición para wind/precipitation;
- conservar pressure-isobars y seis timestamps;
- validar exactamente 42 frames principales;
- reemplazar manifest schema 2→3 en el mismo commit que frontend/API.

### API

- catálogo publica siete capas y overlay;
- frames acepta cuatro IDs nuevos;
- data_url/value_data_url se construyen sin filesystem;
- asset corrupto/ausente produce 503 asset_unavailable;
- layer/timestamp inválido produce 400;
- flags de simulación permanecen en cada respuesta.

No crear endpoints de point sample ni generación runtime.

## Integración frontend

### Tipos, service y store

- ampliar WeatherLayerId a siete literales;
- parsear catálogo schema 3 exacto;
- cargar frame raster+grid según descriptor;
- preservar commit atómico del timestamp;
- añadir capas al scene codec;
- mantener panel responsive/perfil fuera de Zustand/URL;
- una URL con layer desconocido vuelve a wind.

### Controller y adapters

- registrar los cuatro adapters una sola vez;
- setLayer mantiene una sola capa principal visible;
- isobaras continúan independientes;
- conectar AdaptiveRenderingController solo cuando wind está visible;
- registrar TouchMapCoordinator una vez en dispositivos coarse;
- desktop conserva click arbitration de Fase 14;
- resize/orientation no recrea mapa;
- destroy ocurre en orden inverso y es idempotente.

### Composición

- montar LayerExplorer/CompactLegend en panel layers;
- montar PointForecast en panel location;
- aeropuerto, picker y ruta usan ResponsivePanelHost;
- selección touch abre panel pertinente en peek;
- loading/error permanecen locales al producto;
- warning exacto nunca entra al sheet ocultable;
- modo presentación conserva salida y warning en móvil.

## Sincronización temporal

Cada transición prepara:

- frame principal activo;
- overlay isobar si visible;
- aeropuerto seleccionado;
- picker y point forecast;
- ruta/viento relativo;
- leyenda y UTC.

Solo cuando el conjunto obligatorio está listo se publica activeTimestamp. Un
producto nuevo fallido queda partial/fallback sin mostrar otra hora. Requests
con versión anterior se abortan o descartan.

## Reset y URL

Reset exacto:

~~~text
layer=wind
timestamp=06Z
camera=[-73.5,4.5,4.7]
airport=null
coordinate=null
route=null
isobars=false
playing=false
panel=null
~~~

Panel/perfil/orientación no se serializan. Los siete IDs sí. Restaurar escena
espera catálogo/mapa antes de aplicar selecciones; una URL parcial/invalidada
se canonicaliza a defaults seguros.

## Manejo de errores

### Política de fallback

- capa nueva fallida conserva último raster y permite wind;
- grid fallido conserva raster, point value no disponible;
- point forecast partial conserva métricas sanas;
- layer explorer fallido conserva quick row;
- coordinator touch fallido conserva controles de panel y desktop click;
- perfil adaptativo fallido usa conteo conservador;
- WebGL fallido conserva flechas;
- API/catalog fallido conserva estados/retry existentes;
- ninguna falla oculta warning o botón reset.

## Flujos E2E

Actualizar flow-definitions y USER_FLOW_MAP desde código real. Crear como
máximo dos specs nuevos.

### Flujo C — Descubrimiento móvil

1. cargar phone portrait;
2. abrir explorer y elegir cloud-cover;
3. tocar coordenada y validar point forecast;
4. elegir visibility y 09Z;
5. play/pausa;
6. rotar landscape;
7. comprobar escena persistente;
8. reset.

### Flujo D — Tableta aeronáutica

1. cargar tablet portrait;
2. buscar/seleccionar SKBO;
3. crear ruta SKBO→SKRG;
4. elegir wind-gusts y activar isobaras;
5. copiar/restaurar URL;
6. rotar landscape;
7. validar ruta/panel/timestamp;
8. reset.

Los recorridos desktop existentes siguen ejecutándose. Races, assets corruptos
y cada fallback se cubren en unit/integration, no multiplicando E2E.

## Matriz y verificación

Automatizada:

~~~text
Mobile Chrome       360×800 / 800×360
Mobile Safari       390×844 / 844×390
Tablet Chrome       800×1280 / 1280×800
Tablet Safari       768×1024 / 1024×768
Desktop Chrome      1920×1080
~~~

Playwright WebKit es emulación, no evidencia de Safari físico. Ejecutar smoke
manual en:

- un iPhone con Safari real;
- un Android con Chrome real.

Tabletas pueden validarse mediante la matriz automatizada si no hay hardware.

## Escenario de estabilidad móvil

Durante diez minutos en teléfono objetivo:

- recorrer seis timestamps dos veces;
- alternar las siete capas;
- activar/desactivar isobaras;
- abrir/cerrar todos los panels;
- seleccionar/mover/cerrar tres puntos;
- consultar dos aeropuertos;
- crear/invertir/limpiar ruta;
- rotar cuatro veces;
- ocultar/volver a la pestaña;
- forzar degradación y fallback;
- terminar con reset.

Registrar FPS medio/mínimo aproximado, perfil/downgrade, heap inicial/máximo/
final, errores de consola, listeners, requests externas y object URLs.

Objetivos:

- cercano o superior a 30 FPS en equipo de demo;
- degradación si permanece bajo 24 FPS;
- sin crash;
- sin crecimiento continuo de heap;
- cero requests meteorológicas/cartográficas externas.

## Pruebas dirigidas

Backend:

- manifest schema 3, 42 frames y overlay;
- 48 assets nuevos/hashes/validators;
- API catálogo/frame válido e inválidos;
- traversal, asset faltante/corrupto y flags.

Frontend:

- parser catálogo siete capas;
- service por cada nuevo frame y abort;
- store/scene/reset con nuevos IDs;
- controller registry/visibility/destroy;
- orquestador timestamp/races/fallback;
- responsive host + touch + point + explorer;
- perfiles y document visibility.

Ciclos separados, respetando límites del repo:

~~~text
cd backend && source venv/bin/activate && python manage.py check
cd backend && source venv/bin/activate && pytest weather/tests/test_mobile_layer_assets.py weather/tests/test_api.py -v
cd frontend && npm test -- <archivos dirigidos>
cd frontend && npm run build
cd frontend && npx playwright test e2e/weather-mobile-discovery.spec.ts e2e/weather-tablet-aviation.spec.ts
~~~

No ejecutar suite completa. Máximo dos specs E2E por invocación.

## QA y release

1. invocar e2e-user-flows-check después del wiring;
2. invocar skill qa para backend, frontend-unit y E2E;
3. pasar quality gate sin junk tests;
4. validar HTTPS y copia local;
5. desplegar el SHA integrado;
6. repetir smoke mobile sobre URL final;
7. entregar capturas phone portrait/landscape, tablet y desktop;
8. actualizar guion y contingencia;
9. ensayar la reunión desde teléfono.

## Criterios de aceptación

- [ ] Los recorridos desktop anteriores siguen verdes.
- [ ] Siete capas principales funcionan durante seis timestamps.
- [ ] Una sola capa principal está visible y las isobaras son overlay.
- [ ] Phone/tablet usan composición y controles táctiles completos.
- [ ] Tap/pan/pinch no generan selecciones erróneas.
- [ ] Point forecast muestra seis muestras coherentes.
- [ ] Todos los elementos visibles comparten timestamp.
- [ ] URL y reset reconocen nuevas capas con defaults seguros.
- [ ] Warning exacto permanece visible en toda orientación.
- [ ] Fallos nuevos conservan wind/temperature utilizables.
- [ ] No existen requests externos.
- [ ] Diez minutos terminan sin crash o crecimiento continuo.
- [ ] Smoke iPhone Safari y Android Chrome está documentado.
- [ ] E2E flow map, qa y quality gate están verdes.
- [ ] URL HTTPS y ejecución local están verificadas.

## Handoff final

Entregar URL, SHA, comandos locales, dos escenas compartibles, 48 hashes,
capturas por dispositivo, evidencia E2E/QA/performance, perfiles observados,
fallbacks, guion móvil y contingencia.

## Riesgos

- Es la fase con mayor superficie transversal. No comenzar con ramas M2 sin
  integrar.
- Publicar schema 3 antes del parser frontend rompe el demo: backend/frontend/
  manifest se despliegan juntos.
- WebKit emulado no sustituye Safari real; el smoke físico es obligatorio.
- Más capas pueden saturar navegación. Conservar quick row de cuatro y una sola
  capa principal.
