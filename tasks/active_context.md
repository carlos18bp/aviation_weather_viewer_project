# Contexto activo — Fase 11, narrativa temporal y presentación

Actualizado: 2026-08-20.

## Objetivo actual

Entregar módulos aislados para precarga, transición atómica, escena en URL y
modo presentación, sin conectarlos todavía a la vista, store, controller u
orquestador. Fases 09 y 10 avanzan en worktrees paralelos; esta rama no modifica
su ownership ni revierte sus cambios.

## Coordenada Git

- Base resuelta: `master` en `d1b57673c1dad6e959aea5bf029371f41e324dae`.
- Rama: `feat/20082026-phase-11-temporal-presentation`.
- Worktree: `~/webapps/.wt/aviation_weather_viewer_project/phase-11-temporal-presentation`.
- Host: `vps-projectapp-staging` (`host_status=on-work-host`).

## Estado de Fase 11

- Cache LRU abortable de máximo tres keys y plan circular adyacente listos.
- Timeline controlado con progreso de 1500 ms y contrato de transición listo.
- Codec/sincronizador URL puros y controles PresentationMode/SceneShare listos.
- Harness aislado y guía de integración preparados para Fase 14.
- No se editaron archivos centrales ni flows E2E.
- Verificación dirigida: 99/99 tests, quality gate 100/100, ESLint del ownership y build Next verdes.

## Estado validado de entrada — Fase 08

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

## Cierre alcanzado de Fase 08

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
