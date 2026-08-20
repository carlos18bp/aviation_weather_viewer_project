# Contexto activo — Fase 08, release de la demo

Actualizado: 2026-08-20.

## Objetivo actual

Fase 08 cerrada: conservar la demo validada y preparar únicamente el ensayo en
el equipo físico de la reunión. No se autorizan features, refactors ni
expansión del producto.

## Coordenada Git

- Base resuelta: `master`.
- SHA de Fase 07: `fcd8a8ae7e610ea335bcdce6154ffb309f12999b`.
- PR QA integrado: #13.
- SHA QA desplegado y verificado: `054ebdd27b459ba24cff3d65f580ea7bbae95f0d`.
- Rama de QA: `qa/20082026-phase-08-demo-release`.
- Worktree: `~/webapps/.wt/aviation_weather_viewer_project/phase-08-demo-release`.
- Host: `vps-projectapp-staging` (`host_status=on-work-host`).

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

- El toolkit tiene la metadata de dominio/servicios preparada, pero el guard no
  permite asignar `server:` y el resolver tampoco lo escribe.
- El gate global del toolkit está rojo por unidades de backup faltantes de
  `crushme_project`, fuera del ownership de esta fase. Sus cambios no se publican
  mientras ese error exista.
- El 404 de favicon es no bloqueante y queda para después de la reunión.
