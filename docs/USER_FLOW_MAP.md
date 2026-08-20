# Mapa de flujos de usuario

Versión: 3.0.1

Actualizado: 2026-08-20

Alcance inspeccionado: Fase 08, ruta pública `/`, vertical slice desktop a
`1920×1080`.

## Roles

| Rol | Acceso | Propósito |
|---|---|---|
| Público | Sin autenticación | Explorar el escenario meteorológico simulado de Colombia y ejecutar el guion de demostración. |

No existen roles autenticados, permisos, formularios, navegación a otras vistas
ni superficies administrativas.

## Convenciones

- Cada interacción proviene del JSX, controller, servicios o contrato de fase
  vigentes; no se incluyen capacidades futuras.
- `success` significa que una acción del usuario termina y publica un estado
  completo; `display` exige datos reales del fixture congelado, no sólo
  visibilidad; `failure` cubre fallos de red, assets o runtime.
- `error` no aplica: el visor no recibe texto del usuario, no valida formularios
  y no tiene permisos que puedan denegarse.
- La Fase 08 autoriza un único spec E2E desktop para el recorrido principal,
  [`weather-viewer-demo.spec.ts`](../frontend/e2e/weather-viewer-demo.spec.ts).
  Los fallos y fallback conservan una exención E2E deliberada
  (`expectedSpecs: 0`): se verifican con pruebas dirigidas y con el ensayo
  manual, sin multiplicar el corpus Playwright.
- Un cambio de hora sólo termina cuando frame, panel aeroportuario, leyenda y UTC
  corresponden al mismo timestamp. Una carga intermedia conserva el estado
  visible anterior.

## Rol público

### Inventario real de superficies

| Superficie | Evidencia principal | Interacciones reales |
|---|---|---|
| `/` | `frontend/app/page.tsx`, `frontend/features/viewer/WeatherViewer.tsx` | Capa, timeline, playback, aeropuerto, cierre, reset, retries y mapa. |
| Mapa | `frontend/map/WeatherMapController.ts`, adapters de Fases 03–05 | Pan, zoom, selección ICAO y cámara inicial. |
| API same-origin | `frontend/lib/services/weatherService.ts`, servicios aeroportuarios | Catálogo, metadata, WebP, U/V, GeoJSON y condición por timestamp. |

### Matriz por interacción y outcome

| Vista / módulo | Interacción | Clase | Inicio → pasos → estado final | Flow ID | Cobertura |
|---|---|---|---|---|---|
| `/` · bootstrap | Abrir el visor | display | Entrar a `/` → ver shell y warning de inmediato → terminar en mapa Colombia, viento, leyenda `kt`, seis horas y UTC `06Z`. | `viewer-demo-journey` | E2E cubierta. |
| `/` · aeropuerto | Seleccionar SKBO | success | Clic en punto `SKBO` → foco de cámara y panel con datos simulados `06Z` → panel y timestamp sincronizados. | `viewer-demo-journey` | E2E cubierta. |
| `/` · aeropuerto | Cerrar aeropuerto | success | Cerrar el panel sin alterar capa u hora → conservar el visor listo sin selección. | `viewer-demo-journey` | Ensayo manual de estabilidad; no exige un segundo spec. |
| `/` · capas | Cambiar viento ↔ temperatura | success | Clic en capa → conservar vista durante loading → publicar raster/partículas, leyenda y unidad coherentes sin recrear MapLibre. | `viewer-demo-journey` | E2E cubierta. |
| `/` · timeline | Usar anterior, siguiente y selección directa | success | Elegir control u hora → abortar request obsoleta → publicar frame, panel y UTC juntos. | `viewer-demo-journey` | E2E cubierta. |
| `/` · playback | Reproducir y pausar | success | Play → un intervalo de `1500 ms` recorre horas sin ticks durante loading → pausa detiene el único timer. | `viewer-demo-journey` | E2E cubierta con dos ticks. |
| `/` · reset | Restaurar defaults | success | Cambiar capa/hora/cámara y aeropuerto → Reiniciar → `wind/06Z`, cámara inicial, pausa y sin selección. | `viewer-demo-journey` | E2E cubierta. |
| `/` · mapa | Navegar el mapa | success | Arrastrar o hacer zoom dentro de límites regionales → inspeccionar Colombia → reset restaura la cámara inicial. | `viewer-demo-journey` | Ensayo manual de estabilidad; el único spec no duplica esta interacción. |
| `/` · datos | Recorrer los seis timestamps | display | Seleccionar `00/03/06/09/12/15Z` → observar datos de frame y, con aeropuerto, condición de la misma hora. | `viewer-demo-journey` | E2E cubierta. |
| `/` · catálogo | Reintentar catálogo fallido | failure | Abrir con catálogo inválido/503 → shell y mapa permanecen, controles deshabilitados → Reintentar espera MapLibre y carga catálogo + `wind/06Z`. | `viewer-catalog-recovery` | Exenta por contrato de Fase 08; test dirigido + ensayo manual. |
| `/` · aeropuertos | Reintentar GeoJSON fallido | failure | Fallar `/api/v1/airports` → meteorología continúa → Reintentar aeropuertos restaura seis puntos ICAO. | `viewer-airports-recovery` | Exenta por contrato de Fase 08; test dirigido + ensayo manual. |
| `/` · frame/panel | Reintentar transición fallida | failure | Fallar metadata, WebP, U/V o condición seleccionada → conservar vista completa y pausar → retry vuelve a ejecutar la intención. | `viewer-frame-recovery` | Exenta por contrato de Fase 08; test dirigido + ensayo manual. |
| `/` · viento | Continuar tras fallo WebGL del renderer | failure | Fallar partículas/contexto → mostrar aviso y flechas estáticas → selector y timeline siguen disponibles. | `viewer-wind-fallback` | Exenta por contrato de Fase 08; test dirigido + ensayo manual. |
| `/` · mapa | Reintentar inicialización MapLibre | failure | Fallar style/runtime → mostrar error específico → Reintentar crea un controller limpio; sin WebGL2 explica el bloqueo sin retry falso. | `viewer-map-recovery` | Exenta por contrato de Fase 08; test dirigido + ensayo manual. |
| `/` · viewer | Validación o permiso rechazado | error | n/a: no hay inputs, formularios, autenticación ni acciones con autorización. | n/a | No aplica con razón documentada. |

### Estados visibles obligatorios

| Estado | Señal observable |
|---|---|
| Bootstrap | Shell y warning inmediatos; mapa, catálogo, aeropuertos y frame reportan loading por separado. |
| Listo | Capa, leyenda, UTC, timeline y panel comparten un snapshot confirmado. |
| Loading de frame | El frame y timestamp anteriores permanecen visibles; controles temporales quedan bloqueados. |
| Error recuperable | Mensaje en español, visualización previa conservada y acción Retry o Reset. |
| Aeropuertos fallidos | Panel de error independiente; meteorología y timeline siguen funcionales. |
| Fallback | Aviso “Modo alternativo” y viento con flechas estáticas. |
| Warning | `DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL` nunca se oculta. |

## E2E Coverage Index

| Flow ID | Prioridad | Outcomes / contrato | Estado | Evidencia actual |
|---|---:|---|---|---|
| `viewer-demo-journey` | P1 | success, display | Cubierto | `weather-viewer-demo.spec.ts`, tags `@flow:viewer-demo-journey`, `@outcome:success`, `@outcome:display`; recorrido live Desktop Chrome. |
| `viewer-catalog-recovery` | P1 | `expectedSpecs: 0` | Exento | `ViewerOrchestrator.test.ts`: failure y retry; ensayo manual de contingencia. |
| `viewer-airports-recovery` | P2 | `expectedSpecs: 0` | Exento | `ViewerOrchestrator.test.ts`: carga independiente y retry; ensayo manual. |
| `viewer-frame-recovery` | P1 | `expectedSpecs: 0` | Exento | `ViewerOrchestrator.test.ts`: preservación, race, abort y retry; ensayo manual. |
| `viewer-wind-fallback` | P2 | `expectedSpecs: 0` | Exento | Tests dirigidos de orchestrator/renderer y ensayo manual `1920×1080`. |
| `viewer-map-recovery` | P1 | `expectedSpecs: 0` | Exento | Tests dirigidos de shell/controller y validación manual Chrome/Edge `1920×1080`. |

Resumen del registro: 6 flows; 1 cubierto por E2E, 0 `junk-only`, 0 faltantes
y 5 exentos deliberados. El único spec no es un smoke `goto + visible`: conduce
SKBO, capas, seis timestamps, anterior/siguiente/directo, dos ticks de playback,
pausa, reset, recarga y assets same-origin.

## Nota sobre outcomes negativos

La advertencia `negative_case_gaps=1` del auditor es esperada y no revela una
omisión semántica del mapa. Los cinco flows de `failure` están declarados
explícitamente arriba, pero `expectedSpecs: 0` los excluye de los
`required_outcomes` del auditor para respetar su exención E2E. `error` es
genuinamente n/a para esta UI.

No se debe convertir esas exenciones a `outcomes: ["failure"]`, ni añadir
`failure` al único spec: produciría faltantes artificiales y violaría la
autorización de un solo recorrido E2E. Los negativos conservan su validación
dirigida y el ensayo manual exigidos por Fase 08.

## Preguntas abiertas

Ninguna. El alcance permanece limitado al vertical slice determinístico de la
demo.
