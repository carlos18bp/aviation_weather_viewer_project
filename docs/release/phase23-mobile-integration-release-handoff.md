# Fase 23 — Integración móvil, QA y release

Fecha de cierre técnico: 2026-08-21.

## Estado

El vertical slice de Fase 23 está integrado en la rama de sesión
`feat/20082026-phase-23-mobile-release`. Publica schema 3, siete capas
meteorológicas principales, isobaras independientes, seis timestamps, point
forecast, Layer Explorer, composición responsive, coordinación touch y perfil
adaptativo sobre una sola instancia MapLibre.

- Base de la sesión: `662668292acc3236270c4633f069102d5a9c1d9c`.
- PR de Fase 23: [#33](https://github.com/carlos18bp/aviation_weather_viewer_project/pull/33).
- SHA integrado: se registra en el cierre del PR porque el squash SHA no puede
  autorreferenciarse dentro del commit.
- URL desplegada: no aplica; el operador indicó que este ambiente no despliega.
- Smoke físico: pendiente por falta de iPhone y Android reales en esta sesión.
- Warning permanente: `DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL`.

## Precheck de integración

| Fase | PR | Merge SHA | Resultado previo |
|---|---:|---|---|
| 15 | [#28](https://github.com/carlos18bp/aviation_weather_viewer_project/pull/28) | `427fd0f` | integrada, checks verdes |
| 16 | [#26](https://github.com/carlos18bp/aviation_weather_viewer_project/pull/26) | `3bcad46` | integrada, checks verdes |
| 17 | [#25](https://github.com/carlos18bp/aviation_weather_viewer_project/pull/25) | `a5e73a0` | integrada, checks verdes |
| 18 | [#27](https://github.com/carlos18bp/aviation_weather_viewer_project/pull/27) | `8180ff0` | integrada, checks verdes |
| 19 | [#30](https://github.com/carlos18bp/aviation_weather_viewer_project/pull/30) | `c502ccd` | integrada, checks verdes |
| 20 | [#31](https://github.com/carlos18bp/aviation_weather_viewer_project/pull/31) | `10aa236` | integrada, checks verdes |
| 21 | [#32](https://github.com/carlos18bp/aviation_weather_viewer_project/pull/32) | `6626682` | integrada, checks verdes |
| 22 | [#29](https://github.com/carlos18bp/aviation_weather_viewer_project/pull/29) | `1e12568` | integrada, checks verdes |

No había PR funcional M1/M2 pendiente. El recorrido desktop de Fase 14, PR
[#24](https://github.com/carlos18bp/aviation_weather_viewer_project/pull/24),
continuó verde 2/2 sobre `54c6189`. El check previo
`python manage.py generate_mobile_layer_assets --check` validó 48/48 assets y
3.360.836 bytes sin modificar la base activa.

## Contrato backend integrado

- `schema_version=3`.
- Siete capas exactas: `temperature`, `wind`, `precipitation`, `cloud-cover`,
  `cloud-base`, `visibility` y `wind-gusts`.
- Seis timestamps exactos: 00Z, 03Z, 06Z, 09Z, 12Z y 15Z del 2026-01-15.
- 42 descriptores principales y seis descriptores de `pressure-isobars`.
- `value_data_path` obligatorio para temperatura, nubosidad, base de nubes,
  visibilidad y ráfagas; prohibido para viento y precipitación.
- `category` y `supports_point_value` son obligatorios y estrictos.
- `is_simulated=true` y `operational_use=false` permanecen en catálogo, frames
  y errores controlados.
- La API sólo construye `data_url`/`value_data_url` same-origin; no expone paths
  del filesystem ni crea muestreo puntual o generación runtime.
- Layer/timestamp inválido responde 400. Asset ausente, con hash distinto o
  semánticamente corrupto responde 503 `asset_unavailable`.

## Exports públicos consumidos

Fase 23 no reescribe los módulos de Fases 15–22. Los consume mediante estos
entrypoints públicos:

- Fase 15: `ResponsivePanelHost`, `useViewerViewport`,
  `classifyViewerViewport`, `VIEWER_MEDIA_QUERIES` y sus tipos públicos.
- Fase 16: `createAdaptiveRenderingController`,
  `createTemporalFpsMonitor`, `WIND_RENDER_PROFILES`,
  `createMatchMediaWindRenderProfileSelector` y tipos de perfil/lifecycle.
- Fase 17: `TouchMapCoordinator`, `TOUCH_MAP_EVENT_TYPES` y tipos públicos de
  intent, punto, coordenada y facade.
- Fase 18: `AVIATION_LAYER_DEFINITIONS`,
  `AVIATION_LAYER_FRAME_DESCRIPTORS`, parsers, fixtures, sampler bilineal y
  tipos de `aviation-layer-contracts`.
- Fase 19: services, parsers, samplers, leyendas y adapters públicos de
  `cloud-cover`/`cloud-base`.
- Fase 20: services, parsers, samplers, leyendas y adapters públicos de
  `visibility`/`wind-gusts`.
- Fase 21: `PointForecastSeriesLoader`, descriptor map, sample builder,
  reducer, hook y tipos públicos de point forecast.
- Fase 22: `buildLayerExplorerCatalog`, descriptors, órdenes, presentación y
  tipos públicos de Layer Explorer.

El wiring nuevo se limita a service/store/tipos centrales, registry/controller,
orquestador, shell y composición autorizada. Panel, snap, orientación y perfil
gráfico siguen fuera de Zustand y de la URL.

## IDs MapLibre registrados

| Producto | Source | Layer(s) |
|---|---|---|
| Temperatura | `weather-temperature-image` | `weather-temperature-raster` |
| Viento WebGL | n/a, custom layer | `wind-particle-webgl2-layer` |
| Viento fallback | `wind-arrow-fallback-source` | `wind-arrow-fallback-layer` |
| Precipitación | `weather-precipitation-source` | `weather-precipitation-layer` |
| Nubosidad | `weather-cloud-cover-source` | `weather-cloud-cover-layer` |
| Base de nubes | `weather-cloud-base-source` | `weather-cloud-base-layer` |
| Visibilidad | `weather-visibility-source` | `weather-visibility-layer` |
| Ráfagas | `weather-wind-gusts-source` | `weather-wind-gusts-layer` |
| Isobaras | `weather-pressure-isobars-source` | `weather-pressure-isobars-lines`, `weather-pressure-isobars-labels` |
| Aeropuertos | `weather-airports` | `weather-airports-points`, `weather-airports-selection`, `weather-airports-labels` |
| Picker | `weather-picker-source` | `weather-picker-point` |
| Ruta | `weather-route-source` | `weather-route-line`, `weather-route-samples` |

Cada adapter se registra una sola vez. Sólo una capa principal queda visible;
isobaras conserva lifecycle independiente. Resize/orientation llama `resize()`
sin recrear mapa, canvas o contexto.

## Sincronización, URL y reset

Una transición prepara el mismo timestamp para capa, isobaras visibles,
aeropuerto, picker, point forecast, ruta/viento relativo, leyenda y UTC. El
orquestador publica `activeTimestamp` después de la barrera obligatoria y
descarta versiones previas aun si ignoran abort.

El reset verificado termina en:

```text
layer=wind
timestamp=06Z
camera=[-73.5,4.5,4.7]
airport=null
coordinate=null
route=null
isobars=false
playing=false
panel=null
```

Panel, orientación y perfil gráfico nunca se serializan. Los siete IDs sí se
serializan; una capa desconocida canonicaliza a `wind` y una URL parcial o
inválida converge a defaults seguros.

## Fallbacks comprobados

- 503 de capa nueva: conserva último raster/`wind`, no publica otra hora y
  mantiene acceso inmediato a `temperature` y `wind`.
- Grid parcial: raster visible y valor puntual `Valor no disponible`.
- Point forecast parcial: conserva métricas sanas.
- Catálogo de explorer inválido: quick row disponible.
- Coordinator touch inválido: paneles y click desktop permanecen operativos.
- Adaptación inválida: perfil conservador.
- FPS sostenido bajo 24: perfil `phone` pasa una sola vez a `degraded`.
- WebGL inválido o contexto perdido: flechas estáticas.
- Catálogo/API inválido: boundary local y retry existente.
- Warning y reset permanecen visibles bajo todos los fallos anteriores.

## Evidencia automatizada y QA formal

Backend dirigido:

- assets/manifest/validators: schema 3, 7 capas, 42 frames, overlay 6 y 48
  hashes verdes;
- API: 16/16 casos válidos, invalidaciones, traversal, missing/corrupt asset y
  flags verdes;
- reproducibilidad: 1/1; management command `--check`: 48/48.

Frontend dirigido:

- 260 tests verdes en batches de máximo 20 para parser/service/abort, store,
  scene codec/reset, controller, orchestrator atómico/races/fallback, responsive,
  touch, point forecast, explorer, perfiles y document visibility;
- último delta de registry/adaptive callbacks: 4/4;
- TypeScript: verde;
- ESLint del ownership: 0 errores; el único warning E2E fue corregido eliminando
  `force:true` y los flujos Chrome volvieron a pasar 2/2.

E2E:

| Proyecto | Portrait | Landscape | Resultado |
|---|---:|---:|---|
| Mobile Chrome | 360×800 | 800×360 | Flujo C verde |
| Mobile Safari/WebKit | 390×844 | 844×390 | Flujo C verde |
| Tablet Chrome | 800×1280 | 1280×800 | Flujo D verde |
| Tablet Safari/WebKit | 768×1024 | 1024×768 | Flujo D verde |
| Desktop Chrome | 1920×1080 | n/a | recorridos existentes verdes |

La matriz combinada C/D pasó 4/4. Después de retirar el click forzado, Chrome
pasó nuevamente 2/2. Los recorridos desktop base/discovery pasaron 2/2,
responsive shell 2/2 y route scene 1/1. El flow map real registra 30 flujos: 13
cubiertos, 17 exentos con tests unitarios/integration, 0 partial, 0 junk y 0
missing en la auditoría estática completa. Un reporte de una invocación aislada
sólo enumera los flows del spec ejecutado y no sustituye esa auditoría global.

La skill `$qa` cerró backend, frontend-unit y E2E con veredicto aprobado. El
quality gate estricto sobre los tres specs afectados quedó en score 100/100,
con cero errores y cero warnings. La auditoría anti-junk revisó 14 archivos y
123 tests: 123 `KEEP`, cero `REWRITE`, `MERGE` o `DELETE`. El único
`negative_case_gap` del read-out es estructural: los 17 flujos negativos están
exentos de E2E y cubiertos por unit/integration, como exige el scope; no se
añadió cobertura duplicada. No hay tooling de mutation testing configurado.

El build se ejecutó en un ciclo separado después de QA: Next.js 16 compiló,
TypeScript quedó verde y generó las tres páginas estáticas. CI, squash y CI
post-merge se registran después de abrir el PR.

## Estabilidad de diez minutos

Evidencia completa: [phase23-stability-chromium.json](./phase23-stability-chromium.json).

Entorno: Chromium Playwright headless, viewport 360×800, DPR 1 y WebGL2
SwiftShader/Mesa sin GPU física. Es una medición de laboratorio y no sustituye
el gate físico.

| Métrica | Resultado |
|---|---:|
| Duración | 600.380 s |
| FPS promedio | 54,54 |
| FPS mínimo | 4,00 durante degradación inducida |
| Muestras FPS | 17.602 |
| Perfil inicial/final | `phone` / `degraded` |
| Heap inicial | 15.678.472 bytes |
| Heap máximo | 52.068.940 bytes |
| Heap final después de GC/reset | 20.157.460 bytes |
| Listeners inicial/máximo/final | 689 / 1.283 / 693 |
| Object URLs máximo/final | 4 / 4 |
| Canvas MapLibre final | 1 |
| Crashes/page errors | 0 / 0 |
| Requests externas | 0 |
| Errores inesperados de consola/HTTP | 0 / 0 |

El mínimo de 4 FPS corresponde al scheduler bajo carga usado para comprobar la
degradación; el promedio total permaneció sobre 30 FPS. El heap y los listeners
oscilan con las cargas y retornan cerca del baseline después del reset, sin
crecimiento continuo. Los cuatro object URLs corresponden al frame raster/grids
válidos retenidos y no aumentan durante la ventana.

Se completaron: seis timestamps dos veces, siete capas, isobaras on/off, todos
los paneles, tres puntos, dos aeropuertos, ruta crear/invertir/limpiar, cuatro
rotaciones con identidad de canvas, hide/recover, degradación forzada, 503 de
capa nueva con recuperación y reset exacto. Hubo 40 `ERR_ABORTED` locales
esperados por supersession/preload; ninguno fue HTTP fallido ni externo. El único
503 y mensaje de consola fue inducido deliberadamente para el fallback.

## Capturas

| Vista | Archivo | SHA-256 |
|---|---|---|
| Phone portrait 360×800 | [phase23-phone-portrait-360x800.png](./phase23-phone-portrait-360x800.png) | `af048f868142676e3193dea0a844b4f34223edfe2efd197a690d7910bea8c71b` |
| Phone landscape 800×360 | [phase23-phone-landscape-800x360.png](./phase23-phone-landscape-800x360.png) | `5fd5527658c7dde373c1d1798a3086286282ec13142bac0985e61e28eefea469` |
| Tablet portrait 800×1280 | [phase23-tablet-portrait-800x1280.png](./phase23-tablet-portrait-800x1280.png) | `9981d843587238f3df4d5ea196b1d331c197ccb1294825e5d75d5fbaeb1d9637` |
| Tablet landscape 1280×800 | [phase23-tablet-landscape-1280x800.png](./phase23-tablet-landscape-1280x800.png) | `96cdd0b5ec8af96e47eee74063b701f50eb0f35d5dbce82e70b2c0a45c631549` |
| Desktop 1920×1080 | [phase23-desktop-1920x1080.png](./phase23-desktop-1920x1080.png) | `3a3bd8c0953269aefd07586940ef3320e28ab8aeb93415c339a914ac096f41c4` |

Baseline desktop pre-wiring: SHA-256
`d58831832f3dc4cc1d9f7adba4d710a125641c9b795ee68ba1197d5911ba6899`.

## 48 hashes de assets nuevos

Raíz común: `backend/media/demo-weather/demo-colombia-001/`.

```text
d08dfa6ef555ed8da33d136e538f8861f7a1709ab41fbcea41f4cfdea01b8af8  cloud-base-values/00Z.json
72845b818967d71d4b221242bdb031b634ea8484225ed279a5eeaff714302260  cloud-base-values/03Z.json
5c7ae047ec8fa9daba32fdaffaaefd44dbd403b7fd159edb21a71439d492e232  cloud-base-values/06Z.json
e92615568de05aa3c3fa2fb9009927501db7bb86d85384f3365b6f41c824c04e  cloud-base-values/09Z.json
614d48d82f3c3fbf674f20ad714c008eed60883e1e884ebd15668b13ca7ade1b  cloud-base-values/12Z.json
5c2182f32f1577fa7b3c74dcae9151b1b28a68b4c35e353e0e6f206f413e5af6  cloud-base-values/15Z.json
b3e639e6dac521bb58c9a4cd053ed91059b8635c6d3e867a355f2c5621fb877d  cloud-base/00Z.webp
fabd3c17a41a5311d3f840770f181eb31a6badd70b453d89e7cb5f36c8dcd92c  cloud-base/03Z.webp
eafc27f9b4139d3a5101ff4e0ea2b21f93454450298006a281ecfd172b125bab  cloud-base/06Z.webp
71d06687643ef0c9814913792b3bdb4802ded51a75f642dfedf480a1d7c4836d  cloud-base/09Z.webp
352e36acf13363048b3a1291b6deb90ac638135f6930442151227b05a2dbc687  cloud-base/12Z.webp
24ab344648ac079d4355373858a3c7a1a834fdb3b09d3c06db0facbb12a61f11  cloud-base/15Z.webp
6174b4f883f57e60c1b1ede03859e37a2fb656ec7647ab1cdb0be457d2076005  cloud-cover-values/00Z.json
faad9c5d02712440c04b0e2239cebfb5bfcc9abf820edd7ae4454bf80d68cfef  cloud-cover-values/03Z.json
895b90cddd11d0d8da3c87bd98e78f60d0d567009faaeee5d81b6172891355bb  cloud-cover-values/06Z.json
d2d47db1ddad37102031a57c40133dc4cbde4a4cf055934d26738b5ef21ccb32  cloud-cover-values/09Z.json
5e1c98aa0c291b0cc19f6c21f4fb95d661767bd843d7ceffdb9c29d0df7a5598  cloud-cover-values/12Z.json
caa69221024f0804b59856931f020d3e3627802e14e2bc3d157327b9a61c96a7  cloud-cover-values/15Z.json
f6d06bf854ecd3771b5cf20f4fe0e4e5fd11364f7ea8a845041668a1babb8862  cloud-cover/00Z.webp
6fe02b8440cfbe03186aa77e71572c82675b29fc8c97c3166c712caf15459fc6  cloud-cover/03Z.webp
0c1ff0787133b50351a5cf0f43639ed09c8a3ad50530607208d3d51105cb4733  cloud-cover/06Z.webp
504043498031bd2ec54368d02e27d5c3350764cc4465702b0b21c66e2b3d8b01  cloud-cover/09Z.webp
0947788751d5dc54e905eaed40f45d031e01044df7de4ff5b85dd29778fe407c  cloud-cover/12Z.webp
956186fc7a42938b048e69924af48aa0ab68f8528c46e5bfeb12c7ad43c563e2  cloud-cover/15Z.webp
e13e9120566471dceb112483ac677260aa8b1464221391925441f2e803b99e89  visibility-values/00Z.json
a05b8fbab6f30970a091695a7413acca612dfa12e740fbe12b292184d0282120  visibility-values/03Z.json
c864ce746326a9de54f5c63d8f0ad8edf18fdaef8a0a9499896e16e5393943c2  visibility-values/06Z.json
3d426d5cad1a7c329eaa9a866dee405b3a2db90df2236d7efd19b73499e27871  visibility-values/09Z.json
51c5ea807670d840c5ba6c7932d4780e7a2f6e81f4f61723bab6b24f92d58f1d  visibility-values/12Z.json
d2553fdf35744be35f33f5bc8b6704a8be639b40b5151dfc817c082193b8a5ce  visibility-values/15Z.json
841a2b766142f4769fad9ee991511889662fc2c2ec25ec8267c90982954856d8  visibility/00Z.webp
fe997e8a6bcfee947e714df5d1f696ae72ae278107c7adb94313b6af5f5aef21  visibility/03Z.webp
f48ed4a0501d9150bcc449fa88c515dd6d072570d5caa84da24fa4604b473d9e  visibility/06Z.webp
48b19ee9f62aff23d7e7e946a71e2d1f79cd5688f7d0ae5c6fdd747eb3c09b65  visibility/09Z.webp
99e1b3187ccdc575e7545bde4663cfab5a39d766f1b969e531ca8121821172ba  visibility/12Z.webp
0ec9653d23aa19b5e1e9fab2b3d123527cdd18fd8f1f6a1fedc926d14f2150ab  visibility/15Z.webp
bda684a844f97f6737aa354a80551cbc9363a2527fddaf03ec977b7da60019f8  wind-gusts-values/00Z.json
483e3c590b45b005e5ccd734af27e767edfed8f81bab2993a2f4b23b401e349e  wind-gusts-values/03Z.json
d35644e02662c577dc19f8acddd365b5f00e31374e98b994d8c9c03685d4225f  wind-gusts-values/06Z.json
1649148e0dfa1118de45352dbfba6c0fd463b216cafd372210c53d58556fd353  wind-gusts-values/09Z.json
2d2f5d261e9e22cc8e0689bb14d03e1acbc82c2f5ebaef76380482a62b21e330  wind-gusts-values/12Z.json
a2fc4ffb21efcfce54df25b8499d5ead575fb0a8d25bd6a79d523510f7641109  wind-gusts-values/15Z.json
88f5cefa74fcdb9aec0205ac17959f27f8a2a18d7066d90e5776e1b7b5d133a4  wind-gusts/00Z.webp
ebd0627a1cbc97b2997dbc3d7fe4df9b3b64b2d35f8f74e6120f6ef4017826cb  wind-gusts/03Z.webp
15d504277cb202d7887a02bf2c28c478e2e4b19f6df4241da30e79ba3d758369  wind-gusts/06Z.webp
5718550b974443365d76d875565f0f572df5910880d6cc884dce865012e144f6  wind-gusts/09Z.webp
1b7d5bd5a09727cec564c2f156dbd4fae41ba4edadb38ede4a07ee2f50bc11a4  wind-gusts/12Z.webp
073c99031afdd9a9e5019eb85b8733dbd2d9b04cf56aac4a1387d5a78eef842b  wind-gusts/15Z.webp
```

## Escenas compartibles

1. Point forecast de visibilidad a 09Z:
   `/?layer=visibility&t=09Z&picker=-71.84,8.16`
2. Escena aeronáutica SKBO→SKRG con ráfagas e isobaras:
   `/?layer=wind-gusts&airport=SKBO&route=SKBO-SKRG&isobars=1`

## Ejecución local sobre el SHA integrado

```bash
git fetch origin master
git switch --detach <SHA_INTEGRADO>

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Completar los placeholders PostgreSQL/PostGIS.
python manage.py check
python manage.py generate_mobile_layer_assets --check
python manage.py runserver 127.0.0.1:8000

cd ../frontend
npm ci
cp .env.example .env.local
npm run dev
```

Abrir `http://localhost:3000`. Next mantiene API/media same-origin y apunta al
backend configurado por `NEXT_PUBLIC_BACKEND_ORIGIN`.

## Gate físico pendiente y procedimiento para el operador

Playwright WebKit no sustituye Safari ni Chrome reales. Para cerrar este gate:

1. En un host accesible por ambos teléfonos, hacer checkout detached del SHA
   integrado y comprobar `git rev-parse HEAD`.
2. Arrancar backend/frontend con el procedimiento anterior y publicar
   temporalmente el frontend por HTTPS mediante el proxy aprobado del proyecto;
   no añadir servicios meteorológicos ni cartográficos externos.
3. Registrar modelo, OS, versión de Safari/Chrome, URL y SHA antes de probar.
4. iPhone/Safari real: ejecutar Flujo C en portrait, rotar a landscape, volver a
   portrait y terminar con reset. Inspeccionar consola/network con Safari Web
   Inspector.
5. Android/Chrome real: ejecutar Flujo C y luego el tramo aeronáutico de Flujo
   D; inspeccionar con Chrome Remote Devices.
6. En al menos un teléfono ejecutar durante diez minutos el guion de estabilidad
   completo: dos vueltas temporales, siete capas, isobaras, paneles, tres puntos,
   dos aeropuertos, ruta crear/invertir/limpiar, cuatro rotaciones,
   background/foreground, fallback y reset.
7. Capturar FPS promedio/mínimo, perfil/degradaciones, heap inicial/máximo/final,
   console, listeners, network externa y object URLs. Adjuntar screenshots
   portrait/landscape de ambos dispositivos.
8. Rechazar el gate si hay crash, warning/reset ocultos, timestamp mezclado,
   recreación de mapa, crecimiento continuo de heap o request externo.

## Guion móvil para la reunión

1. Abrir con el warning y explicar que todos los datos son simulados/no
   operacionales.
2. En phone portrait abrir `Capas`, mostrar las siete opciones y elegir
   `Nubosidad`.
3. Tocar el mapa, mostrar point forecast de seis horas, cambiar a `Visibilidad`
   09Z, reproducir/pausar y rotar sin perder escena.
4. En tablet seleccionar SKBO, crear SKBO→SKRG, elegir `Ráfagas`, activar
   isobaras y copiar/restaurar la URL.
5. Terminar con reset y señalar `wind`, 06Z, cámara Colombia y ausencia de
   selecciones/paneles.

Contingencia para la reunión:

- WebGL falla: continuar con flechas estáticas.
- Capa nueva falla: volver a `wind`; el último raster válido permanece.
- Grid falla: enseñar raster y `Valor no disponible` sin bloquear la escena.
- Explorer falla: usar quick row.
- Touch falla: usar botones de panel y click desktop.
- API/catálogo falla: usar retry local; nunca ocultar warning ni reset.
- Si el dispositivo físico no supera el gate, mostrar las capturas verificadas
  y no declarar aprobación física.

## Riesgos y decisiones pendientes

- Gate físico iPhone/Safari y Android/Chrome: pendiente, sin resultados
  inventados.
- Despliegue/HTTPS del SHA integrado: omitido únicamente por instrucción del
  operador para este ambiente.
- La métrica automatizada usa renderer software/DPR 1; el rendimiento de GPU y
  densidad reales debe cerrarse en el gate físico.
- Un browser headed de laboratorio solicita `/favicon.ico`, 404 preexistente y
  no funcional fuera del ownership de Fase 23; no apareció en la corrida final
  headless. No afecta API/media ni el warning.
- Los aborts de preloader/versionado son esperados y demuestran descarte de
  respuestas viejas; deben distinguirse de fallos HTTP reales.
