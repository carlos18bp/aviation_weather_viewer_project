# Contexto activo — Fase 14 / integración y release enriquecido

Actualizado: 2026-08-20.

## Estado

Las Fases 09–13 están integradas en `master`; no existen PR funcionales
pendientes de esa ola y sus handoffs están disponibles. La Fase 14 conectó sus
módulos al vertical slice original de Fase 08 desde una rama/worktree propios.
La funcionalidad, el mapa real de flows y la validación visual/estabilidad están
completos; falta el QA/quality gate de cierre antes de declarar el release.

## Entrega funcional de Fase 14

- Store y tipos contienen coordinate, route, isobars, presentation y viewport
  serializables; no contienen recursos runtime.
- Controller expone setters/callbacks enriquecidos y registra meteorología,
  isobaras, ruta, aeropuertos y picker en ese orden.
- Click de aeropuerto selecciona/focaliza sin picker; click de fondo válido abre
  o mueve el picker; `moveend` serializa viewport.
- Búsqueda abre panel/tendencia y los puntos de evolución usan el cambio
  temporal normal.
- Picker y ruta cargan/recalculan con temperatura + U/V del timestamp activo.
- Precipitación es una tercera capa principal exclusiva; isobaras degradan de
  forma independiente.
- URL completa restaura capa, timestamp, viewport, aeropuerto, picker, ruta,
  isobaras y presentación antes del bootstrap, con defaults canonicalizados.
- Transición conserva el frame previo durante loading y realiza fade-out,
  commit único, fade-in y precarga adyacente sin timestamps mezclados.
- Reset termina playback/transición, aborta trabajo, limpia escena y errores,
  restaura cámara y publica `wind/06Z` con URL vacía.

## Evidencia previa a QA

- Flow map real: 21 flows; 8 cubiertos y 13 negativos exentos con pruebas
  unitarias/integration, sin missing/partial/junk-only.
- Dos E2E enriquecidos implementados; discovery y route-scene verdes en sus
  pasadas dirigidas.
- El E2E original de Fase 08 volvió a pasar completo (`1/1`) y los dos E2E
  enriquecidos pasaron juntos (`2/2`).
- TypeScript, ESLint acotado al diff y build Next de producción están verdes.
- `e2e-user-flows-check`: 21 flujos, 8 covered, 13 exempt, 0 missing,
  0 partial y 0 junk-only.
- Chrome y Edge reales: 1920×1080, normal/presentación, reduced motion y escena
  aeropuerto + picker + ruta sin colisiones.
- Fallback estático: 60,1 FPS en Chrome real sobre SwiftShader.
- Estabilidad: 614,5 s, cero fallos funcionales, cero errores console/page,
  cuatro aborts esperados y cero requests pendientes después del reset.

## Validación del Gate E1

- [x] Búsqueda y tendencia funcionan en harness aislado con los seis timestamps.
- [x] El picker distingue coordenada válida, fuera de cobertura sin clamp y
  dato no disponible.
- [x] El manifiesto usa schema 2 y los seis grids numéricos son determinísticos.
- [x] El codec acepta sólo el escenario congelado y serializa una URL canónica.
- [x] Precarga y transición conservan máximo tres frames y realizan un único
  commit sin timestamps mezclados.
- [x] Requests, timers, layers, sources y listeners tienen cleanup probado.
- [x] No existen datos reales, servicios externos ni dependencias nuevas.
- [x] Los PR #16, #18 y #17 están integrados con CI propio verde.
- [x] El operador comunicó GO para abrir E2; Fase 12 no modifica el archivo ni
  reinterpreta el finding histórico de ownership de Fase 09.

## Entrega de Fase 12

- `DemoRoute` valida ICAO conocidos y distintos; origen/destino son controlados.
- Haversine usa `3440.065 NM`; gran círculo produce exactamente 24 muestras.
- `analyzeRoute` reutiliza el sampler U/V, preserva precisión y signos internos.
- GeoJSON contiene ruta, 23 segmentos y 24 muestras ordenadas.
- Adapter posee `weather-route-source`, `weather-route-line` y
  `weather-route-samples`, con cleanup/destroy idempotentes.
- Planner y perfil SVG cubren invertir, limpiar, loading, error, retry, NM, kt,
  UTC y el disclaimer permanente de simulación.
- Verificación: 39/39 tests dirigidos, quality gate `100/100`, ESLint del scope
  y build Next verdes.
- Sin wiring central, endpoints, dependencias, altitud, ETA, combustible o E2E.

## Entrega integrada de Fase 09

- Integrada en `master` mediante PR #16 (`6795540`).
- Host: `vps-projectapp-staging` (`host_status=on-work-host`).
- Búsqueda pura y `AirportSearch`: completos; 18 tests verdes.
- Serie, validación, abort y cache: completos; 16 tests verdes.
- `AirportTrend`: completo; 7 tests verdes.
- Lint dirigido: 0 errores y 0 warnings.
- Captura aislada: `/tmp/phase-09-airport-intelligence.png` a `1920×1080`.
- Wiring, E2E y flow map quedan explícitamente para Fase 14.

## Entrega integrada de Fase 10

- Manifiesto schema 2 con `overlays: []` y `value_data_path` sólo térmico.
- Seis grids térmicos `128×160` versionados; los seis WebP permanecen intactos.
- API con `value_data_url` sólo para temperatura y validación previa a publicar.
- Servicio frontend con cache activo ± adyacentes, U/V inyectable, abort y
  protección contra respuestas tardías.
- Muestreo bilineal local de temperatura/U/V, cobertura previa y dirección
  meteorológica.
- Adapter MapLibre y panel React controlado, sin wiring central.

### Hashes de grids térmicos

| Frame | SHA-256 |
|---|---|
| `00Z.json` | `fb94cea7aae08eb143fb8d8e808285582330231b1396302af0c2ccb6fe64952c` |
| `03Z.json` | `643ebf93950730d0cc030a28d8775ca9da7c65d5930248d046ca5562607041c3` |
| `06Z.json` | `b5501333551ce893e7eb44a24c48be3d82d5730793a49bab36bf747ef1f631b2` |
| `09Z.json` | `63b68ef09a11a6b7c387b3a62ce9a9624e1fb785ac57a819ae0b6bdad15ee4ee` |
| `12Z.json` | `7584912c890f9d09ad1f267266176fcdf36c73a9e4dd9a3ed61095573677e99f` |
| `15Z.json` | `8780d69800396fa494dfff65e43c3a692e21f3261ef30093a6c102094d82310c` |

Dos generaciones temporales completas produjeron hashes idénticos. El
manifiesto resultante tiene SHA-256
`8ad5fc27b9963a89b0dc7fa42187071ecc42bf4a4f8dd1be4ffa5f63bf1687e8`.

## Entrega integrada de Fase 11

- Cache LRU abortable de máximo tres keys y plan circular adyacente.
- Timeline controlado con progreso de 1500 ms y transición temporal atómica.
- Codec/sincronizador URL puros y controles `PresentationMode`/`SceneShare`.
- Harness aislado y guía de integración preparados para Fase 14.
- No se editaron archivos centrales ni flows E2E.
- Verificación dirigida: 99/99 tests, quality gate 100/100, ESLint del ownership y build Next verdes.
- Integrada en `master` mediante PR #17 (`5f6f624`).

## Handoff

- Fase 14 instancia `RouteLayerAdapter`, le entrega cada `RouteAnalysis` y
  llama `reset()` al limpiar/cambiar a estado sin análisis y `destroy()` al
  desmontar el visor.
- Fase 14 compone `RoutePlanner` con el catálogo aeroportuario público y conecta
  sus callbacks a la carga del campo U/V del timestamp activo.
- Fase 14 conserva la última ruta al reintentar y sólo publica un análisis
  completo; no debe redondear ni reconstruir las 24 muestras.
- Fase 13 extiende el mismo schema 2; no crea schema 3 y conserva
  `value_data_path` exclusivo de temperatura.
- Fase 14 registra adapter/servicio/panel, arbitra clicks de aeropuerto mediante
  `shouldHandleClick`, conecta `AirportSearch`/`AirportTrend`, integra
  transición/URL/presentación y limpia recursos al cerrar o destruir.

## Entrega de Fase 13

- El manifiesto continúa en schema `2` y contiene 18 frames principales más
  seis frames del overlay `pressure-isobars`.
- Los seis WebP RGBA de precipitación son `1024×1216`, cubren
  `[-82,-5,-66,14]`, usan rango `0–40 mm/h` y se renderizan a opacidad `0.68`.
- Los seis GeoJSON contienen exclusivamente `LineString` en ocho niveles cada
  `4 hPa`, de `996` a `1024`, con flags simulados/no operacionales.
- Catálogo y frames usan los endpoints existentes. No hay valores de
  precipitación en el picker ni generación de contornos en runtime.
- El parser central valida el catálogo de tres capas, pero entrega sólo
  temperatura/viento al viewer vigente; Fase 14 será dueña de ampliar los tipos
  y conectar la tercera opción visible.

### Leyenda e IDs congelados

- Leyenda: `Precipitación simulada`, `mm/h`, stops `0 #00000000`,
  `0.5 #69d2e7`, `2 #2b8cbe`, `8 #41ab5d`, `15 #f0e442`,
  `25 #f28e2b`, `40 #d73027`.
- Source precipitación: `weather-precipitation-source`.
- Raster precipitación: `weather-precipitation-layer`.
- Source isobaras: `weather-pressure-isobars-source`.
- Líneas isobaras: `weather-pressure-isobars-lines`.
- Labels isobaras: `weather-pressure-isobars-labels`.

### Hashes SHA-256 de assets nuevos

| Frame | Precipitación WebP | Isobaras GeoJSON |
|---|---|---|
| `00Z` | `63cef361d922cf2e433036f569e62a954603640aaca73ea35399f86d024ad9bd` | `59dacd5b59799952390e8285e80200288d09322ca74788c8dfc7a429b66a99f1` |
| `03Z` | `42c57fcbd93e325e7f1a95b56b7a5303749e1616fbb08e52969c1f5d7a9798e6` | `5afe9694ed5c939d859aabdac805f7ffb73802c8b6480614f2d45da2006baf2e` |
| `06Z` | `dc06c080fda61c4cf70d933b2f77c154fe602437517c21255ea9e129dcea1552` | `2035325d926ac828f122e52dbff4ddd59326d0de945877f8bf2efe3c9654b247` |
| `09Z` | `49ed8b1e181d3b39f2281812d3ffd803b12f50147d403351f2ae6fcbabd091f1` | `d995514df8353706b84abc4fa054a3bb3c461b7d9cdd00c4b71d2193608c4050` |
| `12Z` | `a3666e85fab87056e62b58972c8ddc85b1095399519944b36aaf86098b406b14` | `47a73c178f2392fcb911a314cbd5dcb5f7188025c4fd8f9221057dbc43c16c75` |
| `15Z` | `17fe4c070f6cce8055b3cc292161d97cfbf1ec44b438b64360e606218a4b0d54` | `7365423d5f8854750e59cb55d7369f867166f825f368c3348787628ae0f44bfe` |

Manifiesto final: `7d43abfa7a482267bd51f086902dd7e6d6b053330244d9e1809113f7161e0ef8`.
Capturas inspeccionadas: `/tmp/phase-13-06Z.png`
(`dfe337b45d53350099bb6af63723f4e7c02f3d7b0d1b9f508404d23087d8cc7e`)
y `/tmp/phase-13-09Z.png`
(`4668633cbf5f86529828902cf426bc249c5b3e1c029cc0c4e8b465575c2522ab`).

### Handoff de integración para Fase 14

1. Importar `fetchPrecipitationFrame` y `PrecipitationLayerAdapter`; crear el
   adapter una vez, llamar `initialize()`, y para cada commit temporal resolver
   metadata y luego `setFrame(frame)`. El adapter conserva el último frame bueno.
2. Importar `fetchIsobarCatalog`, `selectIsobarFrame` e `IsobarLayerAdapter`;
   cargar el catálogo una vez, seleccionar por timestamp, activar con
   `setVisible(true)` y llamar `loadFrame(frame)`. `false` indica degradación
   controlada del overlay, no fallo de la capa principal.
3. Al ocultar isobaras llamar `setVisible(false)`: aborta el fetch y evita que
   una respuesta tardía vuelva a mostrarlas. Al resetear usar `reset()`.
4. Conectar los callbacks opcionales `onError(error, frame)` a estado inline,
   nunca al error global de la capa principal.
5. Ampliar `viewerTypes`, store, selector, leyenda, controller y orquestador
   únicamente dentro del ownership de Fase 14; no añadir valores de
   precipitación al picker.
6. En teardown llamar `destroy()` en ambos adapters; elimina requests, imagen,
   labels, líneas y sources de forma idempotente.

## Roadmap posterior condicionado

Se definió una ronda adicional Fases 15–23 bajo
`docs/MVP_roadmap/mobile_layer_enrichment/`. Su implementación no comienza
hasta que la Fase 14 esté integrada, desplegada y verde.

- Ola M1: responsive, rendimiento adaptativo, touch GIS y 48 assets staged.
- Ola M2: adapters de cuatro capas, point forecast y explorador de capas.
- Cierre M3: schema 3, wiring central, QA multidispositivo y release.

Objetivos congelados: iOS/Android en phone/tablet, portrait/landscape; capas
cloud-cover, cloud-base, visibility y wind-gusts; una sola instancia MapLibre;
datos simulados/locales; warning permanente.
