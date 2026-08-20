# Contexto activo — Fase 08, release de la demo

Actualizado: 2026-08-20.

## Objetivo actual

Integrar el release candidate QA y verificar el SHA resultante en la URL HTTPS.
No se autorizan features, refactors ni expansión del producto.

## Coordenada Git

- Base resuelta: `master`.
- SHA de Fase 07: `fcd8a8ae7e610ea335bcdce6154ffb309f12999b`.
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

## Próximo gate

1. Commit/push y PR de la rama QA.
2. Esperar CI verde.
3. Ejecutar `merge-when-green` por instrucción del operador.
4. Actualizar el checkout desplegado al SHA integrado.
5. Verificar health, HTTPS y el flujo final sobre ese SHA.

La Fase 08 no se declara terminada antes de completar los cinco pasos.

## Hallazgos operativos separados

- El toolkit tiene la metadata de dominio/servicios preparada, pero el guard no
  permite asignar `server:` y el resolver tampoco lo escribe.
- El gate global del toolkit está rojo por unidades de backup faltantes de
  `crushme_project`, fuera del ownership de esta fase. Sus cambios no se publican
  mientras ese error exista.
- El 404 de favicon es no bloqueante y queda para después de la reunión.
