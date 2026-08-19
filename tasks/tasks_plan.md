# Plan de trabajo — Aviation Weather Viewer

Actualizado: 2026-08-19.

## Fase 00 — Limpieza y dirección visual

Estado: **implementada y verificada; PR #3 abierto sin merge**.

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
- [x] Abrir PR #3 contra `master` sin hacer merge.

## Fases siguientes

| Fase | Entrega | Estado |
|---:|---|---|
| 01 | Mapa base y cámara Colombia | Bloqueada por Fase 00 |
| 02 | Manifiesto y catálogo de assets | Bloqueada por Fase 00 |
| 03 | Campo de viento | Pendiente |
| 04 | Temperatura | Pendiente |
| 05 | Aeropuertos y clima | Pendiente |
| 06 | Controles, timeline e integración | Pendiente |
| 07 | Validación de demo y despliegue | Pendiente |

Los scopes normativos y dependencias entre olas están en
`docs/MVP_roadmap/phase_scopes/README.md`.
