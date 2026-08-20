# Mapa de flujos de usuario

Versión: 4.0.0

Actualizado: 2026-08-20

Alcance inspeccionado: Fase 14, ruta pública `/`, visor desktop enriquecido a
`1920×1080`, composición normal y modo presentación.

## Roles

| Rol | Acceso | Propósito |
|---|---|---|
| Público | Sin autenticación | Explorar y compartir el escenario meteorológico simulado de Colombia durante una demostración comercial. |

No existen roles autenticados, permisos, navegación a otras vistas ni
superficies administrativas.

## Convenciones

- Cada fila nace de JSX, controller, adapters, servicios o contratos ejecutables
  en la UI vigente; no se registran candidatos futuros.
- `success` exige una interacción real y un estado final observable; `display`
  exige valores del escenario congelado, no sólo que un elemento sea visible.
- `error` cubre validación de búsquedas, ruta y URL; `failure` cubre requests,
  assets, Clipboard, Fullscreen, WebGL o renderer fallidos.
- Los dos nuevos specs autorizados cubren únicamente los journeys comerciales.
  Races y negativos permanecen exentos (`expectedSpecs: 0`) con tests
  unit/integration dirigidos; no son gaps ocultos.
- Un cambio temporal sólo termina cuando capa, aeropuerto, picker, ruta,
  isobaras, UTC y leyenda corresponden al mismo timestamp. Durante loading se
  conserva la escena completa anterior.
- La advertencia de simulación es permanente en modo normal, presentación,
  loading, error y fallback.

## Rol público

### Inventario real de superficies

| Superficie | Evidencia principal | Interacciones reales |
|---|---|---|
| `/` | `frontend/app/page.tsx`, `frontend/features/viewer/WeatherViewer.tsx` | Bootstrap/URL, búsqueda, tendencia, capas, isobaras, ruta, compartir, presentación, reset y recovery. |
| Mapa | `WeatherMapController.ts`, `viewerAdapters.ts` | Pan/zoom, click ICAO con precedencia, click de fondo, picker, ruta y overlays. |
| Timeline | `Timeline`, `ViewerOrchestrator`, módulos de Fase 11 | Directo, anterior, siguiente, play/pausa, fade atómico y precarga adyacente. |
| Datos same-origin | servicios de catálogo, aeropuerto, picker, ruta, precipitación e isobaras | Metadata, WebP, grids U/V/temperatura y GeoJSON exclusivamente locales. |

### Matriz por interacción y outcome

| Vista / módulo | Interacción | Clase | Inicio → pasos → estado final | Flow ID | Cobertura |
|---|---|---|---|---|---|
| `/` · bootstrap | Abrir sin query | display | Entrar a `/` → shell+warning inmediatos → mapa Colombia, viento, leyenda `kt`, seis horas y UTC `06Z`. | `viewer-demo-journey` | E2E base cubierta. |
| `/` · bootstrap | Abrir escena completa | display | Abrir URL canónica → aplicar viewport sin animación → restaurar capa, hora, ICAO, picker, ruta, isobaras y modo tras un commit. | `viewer-scene-sharing` | Segundo E2E. |
| `/` · URL | Abrir query parcial o inválida | error | Parsear valores independientemente → defaults seguros y selecciones inválidas omitidas → `replaceState` canónico. | `viewer-scene-normalization` | Exenta: codec + synchronizer + orchestrator. |
| Búsqueda | Buscar `SKBO` y seleccionar | success | Escribir ICAO/IATA/nombre/ciudad → elegir resultado → seleccionar+enfocar aeropuerto y abrir panel/evolución sin crear picker. | `viewer-airport-intelligence` | Primer E2E. |
| Búsqueda | Buscar algo fuera del demo | error | Escribir query sin match → anunciar “No hay aeropuertos” → conservar escena previa. | `viewer-search-validation` | Exenta: component test. |
| Tendencia | Ver seis puntos y elegir `09Z` | display / success | Abrir SKBO → seis condiciones ordenadas → elegir punto `09Z` → ejecutar cambio temporal normal con punto activo resaltado. | `viewer-airport-intelligence` | Primer E2E. |
| Tendencia | Reintentar serie fallida | failure | Fallar alguna condición → conservar aeropuerto → mostrar error+retry → descartar races y cachear éxito. | `viewer-trend-recovery` | Exenta: hook/component tests. |
| Mapa/picker | Click de fondo dentro del bbox | success | Click sin feature ICAO → colocar/reposicionar un único marcador → cargar temperatura+U/V del mismo timestamp y muestrear localmente. | `viewer-weather-picker` | Primer E2E. |
| Mapa/picker | Leer condición del punto | display | Ver coordenadas, °C, kt, dirección y UTC con flags de simulación. | `viewer-weather-picker` | Primer E2E. |
| Mapa/picker | Click sobre aeropuerto | success | Click renderizado sobre ICAO → airport adapter selecciona → picker rechaza ese mismo evento. | `viewer-airport-intelligence` | Primer E2E + integration test. |
| Picker | Cerrar o mover punto | success | Reposicionar con otro click o cerrar → un marcador actualizado o ninguno, sin request por muestra React. | `viewer-weather-picker` | Primer E2E cierra vía reset; movimiento en estabilidad. |
| Picker | Fuera de cobertura / datos fallidos | error / failure | Rechazar coordenada externa o producto incoherente → distinguir estado, conservar marcador y ofrecer retry sólo cuando aplica. | `viewer-picker-recovery` | Exenta: sampler/service/component/orchestrator. |
| Ruta | Crear `SKBO → SKRG` | success | Abrir planner → elegir extremos controlados → analizar 24 muestras del U/V activo y dibujar una sola ruta. | `viewer-route-story` | Segundo E2E. |
| Ruta | Leer perfil | display | Ver NM, frente/cola/cruzado, timestamp y disclaimer no operacional. | `viewer-route-story` | Segundo E2E. |
| Ruta | Invertir o limpiar | success | Invertir extremos o limpiar → recalcular o eliminar ruta/perfil sin alterar la capa. | `viewer-route-validation` | Exenta de E2E: component test + estabilidad. |
| Ruta | Elegir el mismo extremo / recalcular fallido | error / failure | Rechazar origen=destino o campo U/V inválido → conservar controles, mostrar error y permitir retry/clear. | `viewer-route-validation` | Exenta: validation/analysis/orchestrator. |
| Capas | Cambiar viento/temperatura/precipitación | success | Elegir producto → cargar sin mezclar → mantener exactamente una capa principal y leyenda/unidad correctas. | `viewer-atmospheric-layers` | Base cubre dos; segundo E2E cubre precipitación. |
| Isobaras | Activar/desactivar overlay | success / display | Toggle independiente → cargar GeoJSON de la hora activa → mostrar líneas/labels hPa sin cambiar capa principal. | `viewer-atmospheric-layers` | Segundo E2E. |
| Isobaras | Fallar overlay | failure | Fallar GeoJSON → ocultar isobaras+avisar → capa, hora, UTC y leyenda principal siguen comprometidas. | `viewer-isobar-recovery` | Exenta: orchestrator+adapter tests. |
| Timeline | Elegir/anterior/siguiente | success | Aumentar version, abortar obsoleto, cargar productos requeridos, fade-out, commit único, fade-in y precarga adyacente. | `viewer-demo-journey` | E2E base + integration. |
| Timeline | Play/pausa | success | Un timer de `1500 ms` avanza sin tick durante loading → pausa elimina el timer. | `viewer-demo-journey` | E2E base. |
| Frame | Fallo/race de producto requerido | failure | Fallar frame/aeropuerto/picker/ruta o ganar tarde → preservar escena anterior, pausar y ofrecer recovery. | `viewer-frame-recovery` | Exenta: 20 tests de orchestrator. |
| Compartir | Copiar y abrir URL | success / display | Copiar escena normalizada → abrir/reload → recuperar valores y datos reales del fixture. | `viewer-scene-sharing` | Segundo E2E. |
| Compartir | Clipboard ausente/rechazado | failure | Mostrar input read-only enfocado y seleccionado para copia manual. | `viewer-share-fallback` | Exenta: SceneShare tests. |
| Presentación | Entrar/salir por botón o `P` | success / display | Contraer buscador/tendencia/forms → conservar marca, UTC, capa, leyenda, timeline, warning, resultados y salida. | `viewer-presentation-mode` | Segundo E2E. |
| Presentación | Fullscreen no disponible | failure | Explicar fallback → conservar modo interno y salida. | `viewer-presentation-fallback` | Exenta: PresentationMode tests. |
| Mapa/URL | Pan o zoom | success | Navegar bounds → sólo `moveend` publica viewport redondeado → reemplazo debounced de URL. | `viewer-scene-sharing` | Estabilidad + controller/synchronizer tests. |
| Reset | Reiniciar escena enriquecida | success | Abortar requests/precargas y parar timers/transición → limpiar ICAO/picker/ruta/isobaras/modo → cámara inicial + wind/06Z + URL vacía. | `viewer-enriched-reset` | Ambos journeys terminan en reset. |
| Catálogo | Reintentar catálogo fallido | failure | Shell/map siguen visibles → retry valida catálogo y carga default. | `viewer-catalog-recovery` | Exenta: orchestrator. |
| Aeropuertos | Reintentar GeoJSON fallido | failure | Meteorología sigue usable → retry independiente restaura puntos. | `viewer-airports-recovery` | Exenta: orchestrator. |
| Viento | Continuar tras fallo de partículas | failure | Aviso fallback → flechas estáticas y controles activos. | `viewer-wind-fallback` | Exenta: renderer/orchestrator + estabilidad. |
| Mapa | Fallar WebGL2/MapLibre | failure | Mostrar bloqueo o retry honesto sin ocultar warning. | `viewer-map-recovery` | Exenta: shell/controller. |
| Viewer | Permiso denegado | error | n/a: no existen autenticación, roles privilegiados ni acciones autorizables. | n/a | No aplica con razón. |

### Estados visibles obligatorios

| Estado | Señal observable |
|---|---|
| Bootstrap | Warning inmediato; recursos reportan loading de forma independiente. |
| Listo | Capa, UTC, leyenda, timeline y resultados derivados comparten snapshot. |
| Transición | La escena previa permanece; fases `exiting/committing/entering` no cruzan timestamps. |
| Presentación | Warning, UTC, selector/leyenda, timeline y salida permanecen visibles. |
| Error requerido | Escena previa, mensaje en español y retry/reset. |
| Error opcional | Sólo la mejora fallida se oculta o degrada; demo base sigue usable. |
| Warning | Texto inmutable visible permanentemente. |

## E2E Coverage Index

| Flow ID | Prioridad | Outcomes / contrato | Spec / evidencia |
|---|---:|---|---|
| `viewer-demo-journey` | P1 | success, display | `weather-viewer-demo.spec.ts` (recorrido original Fase 08). |
| `viewer-airport-intelligence` | P1 | success, display | `weather-enrichment-discovery.spec.ts`. |
| `viewer-weather-picker` | P1 | success, display | `weather-enrichment-discovery.spec.ts`. |
| `viewer-route-story` | P1 | success, display | `weather-enrichment-route-scene.spec.ts`. |
| `viewer-atmospheric-layers` | P1 | success, display | `weather-enrichment-route-scene.spec.ts`. |
| `viewer-scene-sharing` | P1 | success, display | `weather-enrichment-route-scene.spec.ts`. |
| `viewer-presentation-mode` | P2 | success, display | `weather-enrichment-route-scene.spec.ts`. |
| `viewer-enriched-reset` | P1 | success | Ambos specs enriquecidos. |
| 13 flows negativos | P1–P3 | `expectedSpecs: 0` | Exentos deliberadamente; evidencia dirigida indicada en `flow-definitions.json`. |

Resumen registrado: 21 flows; 8 con cobertura E2E prevista y 13 exentos
deliberados. No hay `junk-only`. Las dos nuevas pruebas deben conducir todos
los controles declarados; los negativos no se duplican en browser.

## Clases por módulo

| Módulo | success | error | failure | display |
|---|---|---|---|---|
| Viewer enriquecido | Búsqueda, picker, ruta, capas, URL, modo y reset. | No-result, ruta inválida y URL normalizada. | Requests/assets/runtime/Clipboard/Fullscreen con recovery. | Datos congelados de aeropuerto, punto, ruta, capas y escena restaurada. |

## Preguntas abiertas

Ninguna. El alcance sigue limitado al escenario local `demo-colombia-001`, la
fecha `2026-01-15`, seis timestamps y desktop Chrome/Edge `1920×1080`.
