# Tasks Plan — Aviation Weather Viewer MVP

> Memory Bank · actualizado 2026-08-19. Fuente operativa:
> `docs/MVP_roadmap/phase_scopes/README.md`.

## Estado por ola

| Ola | Fases | Estado | Condición de salida |
|---|---|---|---|
| Documentación | scopes + contratos | ✅ completa | PR integrado |
| 0 | 00 baseline | ⏳ pendiente | template limpio, contracts/build/checks |
| 1 | 01 GIS, 02 API, 03 datos | bloqueada | tres PRs integrados |
| 2 | 04 airports, 05 temp, 06 wind, 07 controls | bloqueada | cuatro PRs integrados |
| 3 | 08 integración | bloqueada | vertical slice P0 |
| 4 | 09 hardening | bloqueada | performance/memoria aprobados |
| 5 | 10 release | bloqueada | URL/local/tests/ensayos aprobados |
| 6 P1 | 11 search/picker, 12 graphics | bloqueada P1 | ambos PRs integrados |
| 7 P1 | 13 URL/integración | bloqueada P1 | P1 verificado |

## Backlog ejecutable P0

- [ ] Fase 00 — baseline del producto y limpieza del template.
- [ ] Fase 01 — frontend GIS foundation.
- [ ] Fase 02 — backend geoespacial/API.
- [ ] Fase 03 — pipeline simulado.
- [ ] Fase 04 — experiencia de aeropuertos.
- [ ] Fase 05 — visualización de temperatura.
- [ ] Fase 06 — viento WebGL/fallback.
- [ ] Fase 07 — controles/timeline.
- [ ] Fase 08 — integración vertical.
- [ ] Fase 09 — resiliencia/rendimiento.
- [ ] Fase 10 — validación/despliegue/ensayo.

## Backlog P1 bloqueado

- [ ] Fase 11 — búsqueda/picker.
- [ ] Fase 12 — controles gráficos/responsive.
- [ ] Fase 13 — estado URL e integración P1.

## Gates operativos

- Una ola nueva parte de `master` después de integrar la anterior.
- Cada fase usa rama/worktree/PR propio y paths exclusivos.
- Las ramas de ola 2 no editan composición central.
- P1 requiere aceptación P0 documentada por el operador.
- Fase 10 requiere dominio, equipo y resolución de referencia.

## Riesgos abiertos

1. GeoDjango/PostGIS y GEOS/GDAL aún no validados en este repo.
2. WeatherLayers/WebGL2 debe pasar el spike de lifecycle/FPS.
3. Dominio y servicios demo no existen todavía.
4. El basemap local debe verificarse completamente sin red.
5. La lógica del template sigue presente hasta fase 00.

## Deuda del template

Los issues de funcionalidades heredadas del antiguo Memory Bank no son backlog
del producto: esas features se retiran en fase 00. Su evidencia queda en Git.
