# Plan de trabajo — Aviation Weather Viewer

Actualizado: 2026-08-20.

## Fase 00 — Limpieza y dirección visual

Estado: **integrada en `master` mediante PR #3**.

- [x] Verificar integración del PR documental #2.
- [x] Ejecutar `git-sync` y trabajar desde rama/worktree propios.
- [x] Retirar comercio, auth, OAuth, CAPTCHA, staging, manual y attachments.
- [x] Retirar JWT, Redis, Huey, MySQL, `next-themes` y dependencias huérfanas.
- [x] Renombrar Django a `aviation_weather_project` y crear `weather`.
- [x] Configurar PostgreSQL/PostGIS, health y variables sin secretos.
- [x] Fijar psycopg 3.3.4 y MapLibre GL JS 6.3.0.
- [x] Crear placeholder fullscreen con tema y warning congelados.
- [x] Ajustar CI, ignores, media versionable e identidad documental.
- [x] Completar tests dirigidos, build separado y auditoría de residuos.
- [x] Completar `e2e-user-flows-check` sin flujos faltantes ni junk tests.
- [x] Integrar PR #3 en `master` (`f1747230b1f86519af5bd69520b309f22d30c9e6`).

## Fase 01 — Mapa de Colombia y shell GIS

Estado: **integrada en `master` mediante PR #5**.

- [x] Validar que Fase 00 está integrada en la base resuelta.
- [x] Versionar style, GeoJSON, glyphs y worker completamente locales.
- [x] Congelar cámara, zoom y bounds regionales.
- [x] Implementar una única instancia MapLibre con cleanup idempotente.
- [x] Entregar `WeatherMapController` y registry de adapters vacío.
- [x] Entregar store Zustand con el estado mínimo compartido.
- [x] Montar shell fullscreen con slots vacíos y estados WebGL2/ready/error.
- [x] Registrar procedencia y licencias de assets.
- [x] Pasar tests dirigidos, build y validación Chromium offline.
- [x] Integrar PR #5 en `master`.

## Fases siguientes

| Fase | Entrega | Estado |
|---:|---|---|
| 02 | Backend y datos mínimos de demo | Integrada mediante PR #4 |
| 03 | Renderer de viento | Integrada mediante PR #6 |
| 04 | Aeropuertos | Integrada mediante PR #8 |
| 05 | Temperatura | Integrada mediante PR #9 |
| 06 | Controles y timeline | Integrada mediante PR #7 |
| 07 | Integración y acabado | Integrada mediante PR #12 (`fcd8a8ae`) |
| 08 | Entrega de la demo | Integrada/verificada; gate externo del toolkit bloqueado por billing |

Los scopes normativos y dependencias entre olas están en
`docs/MVP_roadmap/phase_scopes/README.md`.

## Corrección operativa — confiabilidad APT en CI

Estado: **integrada en `master` mediante PR #10**.

- [x] Confirmar que la demora ocurre antes de Python/Django y no en Fase 06.
- [x] Separar actualización e instalación APT con logs visibles.
- [x] Agregar retries y timeouts de conexión, step y job.
- [x] Mantener paquetes, servicio PostGIS y tests dirigidos sin cambios.
- [x] Confirmar `backend-health` verde en GitHub Actions.
- [x] Integrar el fix y desbloquear el merge de Fase 06.

## Roadmap de enriquecimiento posterior

Estado: **Fases 09–12 integradas; Gate E1 con GO y Fase 13 implementada,
todavía sin wiring central reservado a Fase 14**.

- [x] Evaluar candidatos visuales y aeronáuticos inspirados en Windy.
- [x] Seleccionar seis fases en dos olas de implementación.
- [x] Congelar contratos de datos, API, estado, URL, picker y ruta.
- [x] Definir ownership sin solapamientos para fases paralelas.
- [x] Definir gates, pruebas, fallback y criterios de release enriquecido.
- [x] Integrar y validar Fase 08.
- [x] Abrir ola E1: fases 09, 10 y 11.
- [x] Implementar Fase 10 sin wiring central ni E2E.
- [x] Implementar e integrar Fase 11 sin wiring central ni E2E.
- [x] Integrar Fase 09 mediante PR #16 (`6795540`).
- [x] Integrar Fase 10 mediante PR #18 (`e6d2f28`).
- [x] Integrar Fase 11 mediante PR #17 (`5f6f624`).
- [x] Ejecutar los checks dirigidos y auditar el Gate E1 sin QA E2E completo.
- [x] Aceptar el veredicto GO comunicado por el operador sin modificar el
  ownership histórico de Fase 09.
- [x] Abrir ola E2: fases 12 y 13.
- [ ] Ejecutar fase 14 de integración, QA y ensayo.

Fuente normativa: `docs/MVP_roadmap/demo_enrichment/README.md`.

### Fase 09 — Inteligencia aeroportuaria

- [x] Cortar rama y worktree propios desde `origin/master`.
- [x] Implementar búsqueda local controlada y accesible.
- [x] Implementar servicio, abort y cache de evolución aeroportuaria.
- [x] Implementar tendencia controlada, compacta y colapsable.
- [x] Pasar únicamente los tests unitarios y de componente dirigidos.
- [x] Publicar PR #16 y handoff para fases 12 y 14.
- [x] Integrar PR #16 en `master` mediante SHA `6795540`.

### Fase 11 — Narrativa temporal y presentación

- [x] Entregar plan adyacente y cache genérica acotada a tres frames.
- [x] Entregar progreso de 1500 ms y runner de transición con commit único.
- [x] Implementar parser, serializer y sincronizador URL canónicos.
- [x] Implementar modo presentación, atajo `P`, Clipboard y Fullscreen fallback.
- [x] Mantener intactos store, controller, `page.tsx`, orquestador y flows E2E.
- [x] Añadir harness aislado, pruebas dirigidas y guía para Fase 14.
- [x] Integrar en `master` mediante PR #17 (`5f6f624`).

### Fase 12 — Historia aeronáutica sobre ruta

- [x] Validar dos ICAO distintos y construir ruta geodésica sin dependencias.
- [x] Calcular Haversine, bearing y exactamente 24 muestras con extremos.
- [x] Reutilizar el sampler U/V público y proyectar viento longitudinal/cruzado.
- [x] Publicar GeoJSON y adapter MapLibre con lifecycle idempotente.
- [x] Entregar selectores controlados, estados operativos y perfil SVG simulado.
- [x] Mantener intactos wiring central, backend, store, controller y flows E2E.
- [x] Pasar exclusivamente tests dirigidos, lint del scope y build separado.

### Fase 13 — Precipitación e isobaras simuladas

- [x] Extender schema `2` a 18 frames principales y seis overlay frames.
- [x] Generar y reemplazar atómicamente seis WebP y seis GeoJSON determinísticos.
- [x] Validar formatos, propiedades, bbox, paths seguros y reproducibilidad.
- [x] Publicar precipitación e isobaras mediante los dos endpoints existentes.
- [x] Crear schemas, servicios, leyenda, callbacks y adapters MapLibre aislados.
- [x] Cubrir abort, request-version, fallback, hide-during-fetch y cleanup.
- [x] Mantener sin cambios el wiring central reservado a Fase 14.
- [x] Ejecutar exclusivamente tests dirigidos, lint, checks y build.
- [x] Preparar capturas 06Z/09Z y handoff completo para Fase 14.

## Roadmap móvil y capas aeronáuticas

Estado: **documentación definida; implementación bloqueada hasta Fase 14
integrada y verde**.

- [x] Auditar limitaciones responsive del visor actual.
- [x] Seleccionar UX móvil propia para iOS/Android y tabletas.
- [x] Priorizar nubosidad, base de nubes, visibilidad y ráfagas.
- [x] Definir nueve fases en dos olas paralelas y un cierre secuencial.
- [x] Congelar contratos de viewport, touch, rendimiento, schema 3 y datos.
- [x] Definir ownership sin solapamientos para cuatro sesiones por ola.
- [x] Definir gates, fallbacks, matriz de dispositivos y QA final.
- [ ] Integrar Fases 12–14 del roadmap anterior.
- [ ] Abrir Ola M1: Fases 15–18.
- [ ] Abrir Ola M2: Fases 19–22.
- [ ] Ejecutar Fase 23 de integración, QA y release móvil.

Fuente normativa:
`docs/MVP_roadmap/mobile_layer_enrichment/README.md`.

## Fase 08 — Validación, despliegue y ensayo

Estado: **producto integrado en `master` y SHA final validado en HTTPS; cierre
operativo global bloqueado únicamente por billing/spending de GitHub Actions en
el toolkit**.

- [x] Confirmar Fase 07 integrada y árbol limpio.
- [x] Desplegar Django + Next detrás de Nginx con HTTPS.
- [x] Ejecutar QA `--apply` en backend, frontend-unit y E2E.
- [x] Cerrar el único flow P1: 1 covered, 5 exempt, 0 missing/junk-only.
- [x] Pasar backend 20/20, frontend-unit 14/14 y E2E live 1/1.
- [x] Pasar quality gate strict con 0 errores y 0 warnings.
- [x] Validar Chrome, Edge y copia local a `1920×1080`.
- [x] Completar 615 s de estabilidad, fallback y reset sin errores críticos.
- [x] Registrar heap, FPS, red, captura, guion y contingencia.
- [x] Integrar el PR QA con `merge-when-green`.
- [x] Desplegar/verificar el SHA de merge en la URL final.
- [x] Publicar dominio, Postgres, servicios y límites en `projects.yml`.
- [ ] Restablecer billing/spending de GitHub Actions y reejecutar verde el CI
  del toolkit para su SHA `b0f2a244`.
