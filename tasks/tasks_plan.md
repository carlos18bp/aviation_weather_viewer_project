# Plan de trabajo — Aviation Weather Viewer

Actualizado: 2026-08-19.

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

Estado: **implementada y verificada; PR de sesión pendiente de abrir**.

- [x] Validar que Fase 00 está integrada en la base resuelta.
- [x] Versionar style, GeoJSON, glyphs y worker completamente locales.
- [x] Congelar cámara, zoom y bounds regionales.
- [x] Implementar una única instancia MapLibre con cleanup idempotente.
- [x] Entregar `WeatherMapController` y registry de adapters vacío.
- [x] Entregar store Zustand con el estado mínimo compartido.
- [x] Montar shell fullscreen con slots vacíos y estados WebGL2/ready/error.
- [x] Registrar procedencia y licencias de assets.
- [x] Pasar tests dirigidos, build y validación Chromium offline.
- [ ] Abrir PR contra `master` sin hacer merge.

## Fases siguientes

| Fase | Entrega | Estado |
|---:|---|---|
| 02 | Backend y datos mínimos de demo | Habilitada por Fase 00; sesión independiente |
| 03 | Renderer de viento | Habilitada por Fase 00; sesión independiente |
| 04 | Aeropuertos | Pendiente de integrar ola 1 |
| 05 | Temperatura | Pendiente de integrar ola 1 |
| 06 | Controles y timeline | Pendiente de integrar ola 1 |
| 07 | Integración y acabado | Pendiente de integrar ola 2 |
| 08 | Entrega de la demo | Pendiente de Fase 07 |

Los scopes normativos y dependencias entre olas están en
`docs/MVP_roadmap/phase_scopes/README.md`.
