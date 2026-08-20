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
| 08 | Entrega de la demo | Release candidate validado; PR QA pendiente de integración |

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

Estado: **documentado; ejecución bloqueada hasta integrar y validar Fase 08**.

- [x] Evaluar candidatos visuales y aeronáuticos inspirados en Windy.
- [x] Seleccionar seis fases en dos olas de implementación.
- [x] Congelar contratos de datos, API, estado, URL, picker y ruta.
- [x] Definir ownership sin solapamientos para fases paralelas.
- [x] Definir gates, pruebas, fallback y criterios de release enriquecido.
- [ ] Integrar y validar Fase 08.
- [ ] Abrir ola E1: fases 09, 10 y 11.
- [ ] Abrir ola E2: fases 12 y 13.
- [ ] Ejecutar fase 14 de integración, QA y ensayo.

Fuente normativa: `docs/MVP_roadmap/demo_enrichment/README.md`.

## Fase 08 — Validación, despliegue y ensayo

Estado: **release candidate validado; cierre formal pendiente de integrar el PR
QA y verificar el SHA resultante en HTTPS**.

- [x] Confirmar Fase 07 integrada y árbol limpio.
- [x] Desplegar Django + Next detrás de Nginx con HTTPS.
- [x] Ejecutar QA `--apply` en backend, frontend-unit y E2E.
- [x] Cerrar el único flow P1: 1 covered, 5 exempt, 0 missing/junk-only.
- [x] Pasar backend 20/20, frontend-unit 14/14 y E2E live 1/1.
- [x] Pasar quality gate strict con 0 errores y 0 warnings.
- [x] Validar Chrome, Edge y copia local a `1920×1080`.
- [x] Completar 615 s de estabilidad, fallback y reset sin errores críticos.
- [x] Registrar heap, FPS, red, captura, guion y contingencia.
- [ ] Integrar el PR QA con `merge-when-green`.
- [ ] Desplegar/verificar el SHA de merge en la URL final.
