# Roadmap de enriquecimiento móvil y capas aeronáuticas

Este paquete comienza después de la Fase 14. Organiza una tercera iteración del
demo enfocada en dos resultados: una experiencia convincente en teléfonos y
tabletas, y una oferta meteorológica visualmente más rica sin abandonar el
carácter simulado, local y no operacional del producto.

La iteración no cambia el stack ni convierte el visor en una plataforma
productiva. Continúa limitada a Colombia, al escenario
**demo-colombia-001**, a la fecha ficticia **2026-01-15** y a seis timestamps.

## Condición de entrada

No iniciar ninguna fase de este paquete hasta que:

1. las Fases 09–13 estén integradas en la base;
2. la Fase 14 haya conectado y validado el enriquecimiento anterior;
3. el recorrido desktop enriquecido esté verde y desplegado;
4. exista evidencia base de FPS, heap y composición a 1920×1080;
5. no queden PR funcionales de las Fases 09–14 pendientes.

Los documentos pueden prepararse y revisarse antes, pero ninguna rama de
implementación 15–23 debe cortarse sobre una base parcial.

## Cómo usar este paquete

Cada sesión recibe exactamente:

1. este README;
2. [00_shared_contracts.md](00_shared_contracts.md);
3. el scope de su fase;
4. AGENTS.md y las reglas locales del repositorio.

Una fase equivale a una sesión, rama, worktree y PR. Las fases paralelas
respetan ownership exclusivo y entregan contratos o módulos aislados. La Fase
23 es la única autorizada a conectar transversalmente las entregas de la Ola
M2.

## Prioridad de producto

Ante una restricción de tiempo, proteger este orden:

1. experiencia gratificante en teléfono portrait;
2. funcionamiento completo en tableta y landscape;
3. nubosidad y visibilidad;
4. exploración meteorológica por coordenada;
5. base de nubes y ráfagas;
6. adaptación automática de rendimiento;
7. refinamientos decorativos.

No se sacrificarán el warning, la coherencia temporal, el recorrido desktop,
el fallback de viento, la ejecución local ni la ausencia de servicios
meteorológicos externos.

## Candidatos evaluados

| Candidato | Valor demo | Costo/riesgo | Decisión |
|---|---:|---:|---|
| UX móvil propia con paneles adaptativos | Muy alto | Medio-alto | Fases 15 y 17 |
| Safe areas, orientación y touch targets | Muy alto | Medio | Fase 15 |
| Calidad WebGL automática | Alto | Medio | Fase 16 |
| Nubosidad total | Muy alto | Medio | Fases 18 y 19 |
| Base de nubes | Alto | Medio | Fases 18 y 19 |
| Visibilidad y niebla | Muy alto | Medio | Fases 18 y 20 |
| Ráfagas de viento | Alto | Bajo-medio | Fases 18 y 20 |
| Evolución por coordenada | Muy alto | Medio | Fase 21 |
| Explorador categorizado de capas | Muy alto | Medio | Fase 22 |
| Turbulencia y engelamiento | Alto | Alto/crítico | Backlog posterior |
| Nivel de congelación o niveles de vuelo | Alto | Alto | Backlog posterior |
| Humedad y punto de rocío | Medio | Medio | Postergado |
| Radar, satélite y rayos | Alto | Crítico | Excluido: sugieren observación real |
| Comparación de modelos | Medio | Alto | Excluido: falsa precisión científica |
| PWA instalable y offline | Medio | Medio-alto | Postergado |
| Personalizar favoritos u opacidad | Bajo | Medio | Postergado por ruido |
| 3D y terreno avanzado | Medio | Alto | Excluido |

Precipitación, isobaras, ruta, búsqueda, tendencia aeroportuaria, picker y
escenas compartibles pertenecen a las Fases 09–14 y no se reimplementan.

La dirección móvil toma como referencia patrones públicos de Windy, como la
navegación fluida con doble tap y drag y el acceso móvil a herramientas
avanzadas, sin consumir su API ni copiar su interfaz:
https://www.windy.com/articles/43511

Referencias normativas/técnicas:

- WCAG 2.2 target size y alternativas a dragging:
  https://www.w3.org/TR/WCAG22/
- CSS safe-area environment variables:
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env
- Handlers táctiles públicos de MapLibre:
  https://maplibre.org/maplibre-gl-js/docs/API/classes/TwoFingersTouchZoomRotateHandler/

## Mapa de olas

| Ola | Fases | Gate de entrada | Ejecución |
|---|---|---|---|
| M1 | 15 responsive, 16 rendimiento, 17 touch GIS, 18 datos | Fase 14 integrada | 4 sesiones paralelas |
| M2 | 19 nubes, 20 visibilidad/ráfagas, 21 punto, 22 capas | Ola M1 integrada | 4 sesiones paralelas |
| M3 cierre | 23 integración móvil y release | Ola M2 integrada | 1 sesión secuencial |

~~~text
Fase 14 integrada
        │
        ├──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
   Fase 15         Fase 16        Fase 17        Fase 18
   responsive      rendimiento    touch GIS      datos
        └──────────────┴──────────────┴──────────────┘
                               │
                          Gate Ola M1
                               │
        ┌──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
   Fase 19         Fase 20        Fase 21        Fase 22
   nubes           visibilidad    punto          capas
                   y ráfagas
        └──────────────┴──────────────┴──────────────┘
                               │
                          Gate Ola M2
                               │
                               ▼
                           Fase 23
                     integración/QA/release
~~~

## Índice de fases

| Fase | Archivo | Entrega principal |
|---:|---|---|
| 15 | [01_phase_15_responsive_foundation.md](01_phase_15_responsive_foundation.md) | Shell responsive y panel host |
| 16 | [02_phase_16_adaptive_rendering.md](02_phase_16_adaptive_rendering.md) | Perfiles WebGL automáticos |
| 17 | [03_phase_17_touch_map_interactions.md](03_phase_17_touch_map_interactions.md) | Coordinación táctil GIS |
| 18 | [04_phase_18_aviation_layer_data.md](04_phase_18_aviation_layer_data.md) | Dataset staged de cuatro capas |
| 19 | [05_phase_19_cloud_layers.md](05_phase_19_cloud_layers.md) | Nubosidad y base de nubes |
| 20 | [06_phase_20_visibility_gust_layers.md](06_phase_20_visibility_gust_layers.md) | Visibilidad y ráfagas |
| 21 | [07_phase_21_point_forecast.md](07_phase_21_point_forecast.md) | Evolución meteorológica por punto |
| 22 | [08_phase_22_layer_explorer.md](08_phase_22_layer_explorer.md) | Explorador de capas y leyenda |
| 23 | [09_phase_23_mobile_integration_release.md](09_phase_23_mobile_integration_release.md) | Vertical slice móvil enriquecido |

## Ownership por ola

### Ola M1

| Fase | Ownership exclusivo |
|---|---|
| 15 | Shell, composición responsive, estilos de controles existentes y panel host |
| 16 | Renderer de viento, perfiles automáticos y cache temporal adaptativa |
| 17 | Nuevos módulos de coordinación touch y su harness |
| 18 | Generadores modulares, assets staged y contratos de datos aeronáuticos |

La Fase 15 puede editar composición central porque ninguna otra rama de M1 lo
hace. Las Fases 16–18 no editan WeatherViewer, store, controller, scene codec
ni flows E2E.

### Ola M2

| Fase | Ownership exclusivo |
|---|---|
| 19 | Features, services y adapters de cloud-cover/cloud-base |
| 20 | Features, services y adapters de visibility/wind-gusts |
| 21 | Feature y componentes de point forecast |
| 22 | LayerExplorer, CompactLegend y descriptores de navegación |

Las Fases 19–22 no editan manifest vivo, API central, store,
WeatherMapController, orquestador, scene codec ni composición. Entregan
interfaces controladas y harnesses para la Fase 23.

### Cierre M3

La Fase 23 tiene ownership temporal sobre los puntos de integración:

~~~text
backend/weather/demo/constants.py
backend/weather/demo/generation.py
backend/weather/demo/validators.py
backend/weather/demo/loaders.py
backend/weather/views.py
backend/media/demo-weather/demo-colombia-001/manifest.json
frontend/features/viewer/**
frontend/lib/services/weatherService.ts
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/features/presentation/**
frontend/e2e/**
docs/USER_FLOW_MAP.md
~~~

No reimplementa los módulos entregados por fases anteriores.

## Requerimientos por fase

| Fase | Funcionales | No funcionales |
|---:|---|---|
| 15 | MRF-001 a MRF-003 | MRNF-006, MRNF-009, MRNF-010 |
| 16 | MRF-005 | MRNF-005, MRNF-007, MRNF-008 |
| 17 | MRF-004 | MRNF-006, MRNF-007, MRNF-008 |
| 18 | MRF-006 a MRF-009 | MRNF-001, MRNF-002 |
| 19 | MRF-006, MRF-007 | MRNF-003, MRNF-007, MRNF-008 |
| 20 | MRF-008, MRF-009 | MRNF-003, MRNF-007, MRNF-008 |
| 21 | MRF-010 | MRNF-004, MRNF-006 a MRNF-008 |
| 22 | MRF-011 | MRNF-006, MRNF-010 |
| 23 | MRF-012, MRF-013 | MRNF-001 a MRNF-010 |

Los IDs y contratos normativos viven en
[00_shared_contracts.md](00_shared_contracts.md).

## Gate de la Ola M1

- el recorrido completo de Fase 14 es usable a 360×800 y 768×1024;
- no hay controles bajo safe areas ni overflow grave;
- orientación/resize no recrean MapLibre;
- los perfiles de partículas degradan sin oscilación y limpian RAF;
- tap, pan, pinch y selección se distinguen en un harness aislado;
- existen 48 assets nuevos con hashes reproducibles;
- los assets nuevos no aparecen todavía en el catálogo vivo;
- las cuatro ramas pasan sus pruebas dirigidas y están integradas.

## Gate de la Ola M2

- las cuatro capas cargan seis timestamps desde descriptores inyectados;
- cada adapter crea sus resources una vez y los destruye de forma idempotente;
- cloud-base soporta null sin romper muestreo o leyenda;
- point forecast nunca mezcla timestamps ni hace requests por movimiento;
- el explorador funciona con touch, teclado y sin hover;
- ninguna rama M2 modifica los puntos de integración reservados;
- las cuatro ramas están integradas antes de iniciar la Fase 23.

## Gate del demo móvil enriquecido

- los recorridos desktop de Fases 08 y 14 no presentan regresiones;
- existen siete capas principales y el overlay de isobaras;
- teléfono, tableta y desktop comparten una sola instancia MapLibre;
- todos los datos visibles pertenecen al mismo timestamp;
- URL y reset reconocen los nuevos IDs con defaults seguros;
- fallar una capa nueva conserva viento/temperatura utilizables;
- el warning exacto permanece visible en todas las orientaciones;
- no existen requests meteorológicas o cartográficas externas;
- Playwright cubre Mobile Chrome, Mobile Safari/WebKit, tablet y desktop;
- existe smoke manual en un iPhone Safari y un Android Chrome reales;
- diez minutos de uso móvil no presentan crash ni crecimiento continuo;
- e2e-user-flows-check, qa y quality gate quedan verdes.

## Política de integración y conflictos

- Cada ola parte de un único SHA después de integrar por completo la anterior.
- Los contratos compartidos no se editan desde fases funcionales.
- Un bloqueo de contrato se documenta en el handoff y se resuelve entre olas.
- Una fase consume exports públicos; nunca internals de otra.
- Los assets de Fase 18 permanecen staged hasta Fase 23 para no romper el
  parser estricto del catálogo vigente.
- Varias ramas se drenan con merge-queue; nunca se reutiliza una rama ajena.
- La Fase 23 absorbe conflictos centrales después de integrar toda M2.

## Fuera de este roadmap

No se incluyen datos reales, nuevas fechas, más modelos, niveles verticales,
radar, satélite, METAR/TAF/SIGMET, alertas, PWA, offline productivo,
geolocalización del dispositivo, auth, usuarios, favoritos persistentes,
temas, selector manual de calidad, opacidad configurable ni infraestructura
productiva adicional.

## Prompt base para cada sesión

~~~text
Implementa únicamente la fase asignada del roadmap mobile_layer_enrichment.
Lee AGENTS.md, mobile_layer_enrichment/README.md,
00_shared_contracts.md y el scope de tu fase. Respeta ownership y archivos
prohibidos. Trabaja en rama/worktree propios, ejecuta pruebas dirigidas y
entrega PR con handoff explícito. Los datos continúan siendo simulados,
determinísticos, locales y no operacionales.
~~~
