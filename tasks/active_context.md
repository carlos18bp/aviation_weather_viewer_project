# Contexto activo — Fase 01

Actualizado: 2026-08-19.

## Objetivo actual

Entregar el mapa local de Colombia, el shell GIS, el controller y el store
mínimo, sin integrar módulos meteorológicos de las fases 02/03.

## Coordenada Git

- Base resuelta: `master`.
- SHA base: `f1747230b1f86519af5bd69520b309f22d30c9e6`.
- Rama: `feat/19082026-phase-01-map-shell`.
- Worktree: `~/webapps/.wt/aviation_weather_viewer_project/phase-01-map-shell`.
- Gate: Fase 00/PR #3 integrada y contenida en `origin/master`.
- Handoff: PR de Fase 01 pendiente de abrir; esta sesión no hace merge.

## Cambios implementados

- Basemap local con costa, vecinos, Colombia, 33 departamentos y labels.
- Web Worker y glyphs MapLibre same-origin, sin URLs remotas de runtime.
- Cámara, zoom y bounds regionales congelados en el controller.
- Lifecycle de una instancia con initialize/destroy idempotentes y resize.
- Registry tipado de adapters vacío para temperatura, viento y aeropuertos.
- Store Zustand exacto, sin mapa, viewport ni capacidades descartadas.
- Shell fullscreen con tres slots visuales vacíos y warning permanente.
- Fallback WebGL2, loading, ready, error y retry controlado.

## Verificación completada

- Controller: 14 tests passed.
- Store: 11 tests passed.
- Shell: 10 tests passed.
- Página heredada: 3 regression tests passed.
- `npm run build`: compilación, TypeScript y prerender de `/` correctos.
- Chromium `1920×1080`: mapa centrado y shell sin overflow grave.
- Pan y zoom modifican el render; resize conserva estado `ready`.
- Al desmontar, el worker pasa de uno a cero; cleanup doble se prueba en unit.
- Red externa bloqueada: 0 requests externas y 0 errores de consola.
- Flow audit: 1 flow de Fase 00 todavía exento; su actualización semántica se
  difiere por ownership al handoff de integración.

## Handoff

Antes del cierre se abrirá el PR de sesión contra `master`. El handoff debe
actualizar el flow map compartido: la exención `viewer-phase-00-placeholder` ya
no describe la raíz interactiva, pero `frontend/e2e/**` queda fuera del
ownership exclusivo de Fase 01.

## Límites activos

No implementar aeropuertos, API o assets meteorológicos, viento, temperatura,
timeline, leyendas, paneles funcionales, search, opacity, quality, URL state,
cambio de tema ni módulos de Fase 03.
