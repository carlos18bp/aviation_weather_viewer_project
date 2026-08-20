# Mapa de flujos de usuario

Versión: 3.0.0

Actualizado: 2026-08-20

Alcance inspeccionado: Fase 07, ruta pública `/`, vertical slice desktop a
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
- La Fase 08 autoriza un solo spec E2E desktop para el recorrido principal. Los
  fallos y fallback tienen exención E2E deliberada (`expectedSpecs: 0`) porque
  su contrato exige tests dirigidos y ensayo manual, no más specs Playwright.
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

| Vista / módulo | Interacción | Clase | Inicio → pasos → estado final | Flow ID | Cobertura E2E |
|---|---|---|---|---|---|
| `/` · bootstrap | Abrir el visor | display | Entrar a `/` → ver shell y warning de inmediato → terminar en mapa Colombia, viento, leyenda `kt`, seis horas y UTC `06Z`. | `viewer-demo-journey` | Falta; pertenece a Fase 08. |
| `/` · aeropuerto | Seleccionar y cerrar SKBO | success | Clic en punto `SKBO` → foco de cámara y panel con datos simulados `06Z` → cerrar panel sin alterar capa/hora. | `viewer-demo-journey` | Falta; mismo spec único. |
| `/` · capas | Cambiar viento ↔ temperatura | success | Clic en capa → conservar vista durante loading → publicar raster/partículas, leyenda y unidad coherentes sin recrear MapLibre. | `viewer-demo-journey` | Falta; mismo spec único. |
| `/` · timeline | Usar anterior, siguiente y selección directa | success | Elegir control u hora → abortar request obsoleta → publicar frame, panel y UTC juntos. | `viewer-demo-journey` | Falta; mismo spec único. |
| `/` · playback | Reproducir y pausar | success | Play → un intervalo de `1500 ms` recorre horas sin ticks durante loading → pausa detiene el único timer. | `viewer-demo-journey` | Falta; mismo spec único. |
| `/` · reset | Restaurar defaults | success | Cambiar capa/hora/cámara y aeropuerto → Reiniciar → `wind/06Z`, cámara inicial, pausa y sin selección. | `viewer-demo-journey` | Falta; mismo spec único. |
| `/` · mapa | Navegar el mapa | success | Arrastrar o hacer zoom dentro de límites regionales → inspeccionar Colombia → reset restaura la cámara inicial. | `viewer-demo-journey` | Falta; mismo spec único. |
| `/` · datos | Recorrer los seis timestamps | display | Seleccionar `00/03/06/09/12/15Z` → observar WebP o U/V y, con aeropuerto, condición de la misma hora. | `viewer-demo-journey` | Falta; mismo spec único. |
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
| `viewer-demo-journey` | P1 | success, display | Falta | Unit/integration dirigidos verdes; el spec desktop se crea en Fase 08. |
| `viewer-catalog-recovery` | P1 | `expectedSpecs: 0` | Exento | `ViewerOrchestrator.test.ts`: failure y retry. |
| `viewer-airports-recovery` | P2 | `expectedSpecs: 0` | Exento | `ViewerOrchestrator.test.ts`: carga independiente y retry. |
| `viewer-frame-recovery` | P1 | `expectedSpecs: 0` | Exento | `ViewerOrchestrator.test.ts`: preservación, race, abort y retry. |
| `viewer-wind-fallback` | P2 | `expectedSpecs: 0` | Exento | Tests dirigidos de orchestrator/renderer y ensayo manual `1920×1080` completado. |
| `viewer-map-recovery` | P1 | `expectedSpecs: 0` | Exento | Tests dirigidos de shell/controller y validación manual `1920×1080` completada. |

Resumen del registro: 6 flows; 0 cubiertos por E2E, 0 `junk-only`, 1 faltante
P1 y 5 exentos deliberados. No existen specs Playwright en Fase 07 y ninguna
prueba `goto + visible` recibe crédito.

## Brecha que desbloquea Fase 08

Crear `frontend/e2e/weather-viewer-demo.spec.ts` con tags
`@flow:viewer-demo-journey`, `@outcome:success` y `@outcome:display`. Debe conducir
el flujo único congelado por la Fase 08: bootstrap `wind/06Z`, SKBO, temperatura,
anterior/siguiente/directo, seis timestamps, dos ticks de playback, pausa, vuelta
a viento, reset y recarga reproducible.

## Preguntas abiertas

Ninguna para Fase 07. Los errores/fallback quedan conscientemente en la matriz
manual y dirigida definida por la Fase 08; no autorizan nuevos specs ni features.
