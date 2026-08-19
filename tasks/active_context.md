# Active Context — Aviation Weather Viewer

> Memory Bank · actualizado 2026-08-19. Refrescar al cerrar cada sesión significativa.

## Foco actual

Plan de ejecución visual-first para la próxima reunión:

1. ✅ Roadmap amplio versionado.
2. ✅ Double check: la necesidad real es una demo visual de Colombia.
3. ✅ Backend, frontend y contratos recortados a lo visible/necesario.
4. ✅ Nueve fases organizadas en cinco olas con máximo tres sesiones paralelas.
5. ⏳ Próxima ejecución: fase 00.

## Decisiones activas

- Objetivo: impresionar visualmente, no completar un MVP convencional.
- Tema único oscuro aeronáutico; no existe dark/light mode.
- Target formal: Chrome/Edge `1920×1080`.
- Default visible: viento `06Z` sobre Colombia.
- Django/DRF/PostGIS permanecen, con `Airport` como único modelo de dominio.
- Manifiesto local reemplaza modelos de escenario/frame.
- WeatherLayers es opción primaria, encapsulada y gateada por fase 03.
- Solo fase 07 integra store/controller/página.
- Search, picker, opacity, quality, mobile y URL state están fuera del plan.

## Cambios recientes

- Eliminadas las tres fases P1.
- Fusionados backend geoespacial y generador en una sola fase mínima.
- Fusionados hardening, QA, performance y deployment en la fase de release.
- Simplificados API, store, controller, renderer y flujo de timestamp.
- Sustituidas catorce fases por nueve scopes visual-first.
- Actualizado Memory Bank con el alcance de reunión.

## Estado real del código

El visor todavía no está implementado. `master` conserva el starter de comercio;
ninguna fase funcional está Done hasta ejecutar sus criterios.

## Próximos pasos

1. Integrar el PR documental revisado.
2. Ejecutar fase 00 en una nueva sesión/worktree.
3. Integrar fase 00 y abrir en paralelo fases 01, 02 y 03.
4. Drenar ola 1 antes de abrir fases 04, 05 y 06.
5. Reservar fase 07 para integración y fase 08 para release, sin features nuevas.
