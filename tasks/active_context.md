# Contexto activo — Fase 00

Actualizado: 2026-08-19.

## Objetivo actual

Cerrar la limpieza del starter y dejar una base mínima verificable para la demo
meteorológica de Colombia.

## Coordenada Git

- Base resuelta: `master`.
- SHA base: `c677fcc6e611425cc0691296c069cbea44bb2b24`.
- Rama: `feat/19082026-phase-00-visual-foundation`.
- Worktree: `~/webapps/.wt/aviation_weather_viewer_project/phase-00-visual-foundation`.
- Gate: PR documental #2 integrado y contenido en la base.

## Cambios implementados

- Starter funcional de comercio, auth y attachments eliminado.
- Backend reducido a `aviation_weather_project` + `weather` + health.
- PostGIS configurado como único motor local/CI.
- Frontend reducido a una raíz fullscreen estática con identidad y warning.
- Dependencias y lockfiles reducidos; MapLibre/psycopg fijados.
- CI, `.env.example`, `.gitignore`, NOTICE y guías actualizados.
- Ecosistemas Claude/Codex/Windsurf sincronizados desde guía compartida.

## Verificación completada

- `python manage.py check`: 0 issues.
- `SELECT PostGIS_Full_Version()`: PostgreSQL 16 / PostGIS 3.4.2.
- `pytest weather/tests/test_health.py -v`: 4 passed.
- `npm test -- app/__tests__/page.test.tsx`: 3 passed.
- `npm run build`: compilación y prerender de `/` correctos con Next 16.3.1.
- `npm audit`: 0 vulnerabilidades.
- Auditoría `rg`: 0 rutas, imports, copy o dependencias funcionales del starter.
- Flow audit: 1 flow exento deliberadamente, 0 missing, 0 junk-only.

## Cierre pendiente

Commit, push y PR contra `master`; no hacer merge.

## Límites activos

No implementar mapa, aeropuertos, assets meteorológicos, viento, temperatura,
timeline, paneles funcionales, selector de tema ni responsive avanzado.
