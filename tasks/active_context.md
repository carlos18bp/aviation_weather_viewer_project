# Contexto activo — Fase 09, inteligencia aeroportuaria

Actualizado: 2026-08-20.

## Objetivo actual

Entregar búsqueda local y evolución simulada para los seis aeropuertos mediante
módulos controlados, sin wiring al visor principal. La Fase 14 conectará los
callbacks con store/controller y la Fase 12 consumirá el ranking público.

## Coordenada Git

- Base resuelta: `master`.
- Rama de sesión: `feat/20082026-phase-09-airport-intelligence`.
- Worktree: `~/webapps/.wt/aviation_weather_viewer_project/phase-09-airport-intelligence`.
- PR abierto contra `master`: #16.
- Ownership: `features/airports/search`, `features/airports/trend`,
  `AirportSearch`, `AirportTrend`, servicio e índices aeroportuarios.
- SHA de Fase 07: `fcd8a8ae7e610ea335bcdce6154ffb309f12999b`.
- PR QA integrado: #13.
- SHA QA desplegado y verificado: `054ebdd27b459ba24cff3d65f580ea7bbae95f0d`.
- Rama de QA: `qa/20082026-phase-08-demo-release`.
- Worktree: `~/webapps/.wt/aviation_weather_viewer_project/phase-08-demo-release`.
- Host: `vps-projectapp-staging` (`host_status=on-work-host`).

## Restricciones activas de Fase 09

- No editar composición, store, controller, orquestador, tipos centrales ni flow map.
- No crear endpoints, datos reales, librerías de charts ni E2E.
- No importar internals de las fases 10–11.
- Ejecutar solo tests dirigidos de búsqueda, serie/cache y tendencia.

## Estado de implementación

- Búsqueda pura y `AirportSearch`: completos; 18 tests verdes.
- Serie, validación, abort y cache: completos; 16 tests verdes.
- `AirportTrend`: completo; 7 tests verdes.
- Lint dirigido: 0 errores y 0 warnings.
- Captura aislada: `/tmp/phase-09-airport-intelligence.png` a `1920×1080`.
- Wiring, E2E y flow map quedan explícitamente para Fase 14.
- PR: `https://github.com/carlos18bp/aviation_weather_viewer_project/pull/16`;
  queda abierto y sin merge para el drenaje de la ola.

## Estado validado

- URL: `https://aviation-weather-platform.projectapp.co`.
- Django check y build de producción verdes.
- Backend 20/20; frontend-unit 14/14; E2E live Desktop Chrome 1/1.
- QA: 1 flow covered, 5 exempt, 0 missing/junk-only/unvalidated.
- Quality gate strict: 0 errors, 0 warnings.
- Chrome 147, Edge 151 y ejecución local completan el recorrido a `1920×1080`.
- Estabilidad: 615 s, 9 ciclos, sin errores críticos ni requests externas;
  heap post-GC estabilizado y fallback estático a 60,8 FPS.

## Riesgo abierto de equipo

El host sólo tiene 1 vCPU y ANGLE/SwiftShader: las partículas miden
aproximadamente 0,6–1,4 FPS y no permiten acreditar el objetivo de ~30 FPS para
una GPU física. La densidad ya está fija en 2500 y el fallback de flechas es
fluido. Repetir el ensayo en el portátil de la reunión antes de presentar.

## Cierre alcanzado

1. El PR QA #13 pasó los cuatro checks obligatorios y se integró con
   `merge-when-green`.
2. El checkout de staging avanzó a `054ebdd27b459ba24cff3d65f580ea7bbae95f0d`.
3. Django check, migraciones, build, servicios, health y raíz HTTPS quedaron
   verdes sobre ese SHA.
4. El recorrido E2E live final pasó 1/1 después de ampliar exclusivamente la
   espera de bootstrap a 60 s; no se modificó producción ni se relajaron
   aserciones funcionales.

## Hallazgos operativos separados

- El toolkit publicó dominio/servicios en `b0f2a244`; el guard no permite
  asignar `server:` y el resolver tampoco lo escribe, por lo que el registro
  conserva `status: scaffold` con la explicación operativa.
- El falso rojo de backup de `crushme_project` se resolvió mediante su exención
  Huey explícita; los gates locales quedaron completamente verdes.
- El CI remoto del toolkit no arrancó ningún step: GitHub reporta payments
  fallidos o spending limit. Requiere acción de billing del operador y rerun del
  workflow `32328692139`.
- El 404 de favicon es no bloqueante y queda para después de la reunión.
