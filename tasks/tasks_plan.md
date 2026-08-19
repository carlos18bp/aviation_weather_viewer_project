# Tasks Plan — Demo visual meteorológica de Colombia

> Memory Bank · actualizado 2026-08-19. Fuente operativa:
> `docs/MVP_roadmap/phase_scopes/README.md`.

## Estado por ola

| Ola | Fases | Estado | Condición de salida |
|---|---|---|---|
| Documentación | scopes + contratos | ✅ revisada | PR integrado |
| 0 | 00 limpieza/visual | ⏳ pendiente | starter limpio y baseline verde |
| 1 | 01 mapa, 02 backend/datos, 03 viento | bloqueada | tres PRs integrados |
| 2 | 04 aeropuertos, 05 temperatura, 06 controles | bloqueada | tres PRs integrados |
| 3 | 07 integración/pulido | bloqueada | vertical slice visual |
| 4 | 08 validación/release | bloqueada | demo desplegada y ensayada |

## Backlog ejecutable

- [ ] Fase 00 — limpiar starter y congelar dirección visual.
- [ ] Fase 01 — mapa Colombia, shell, controller y store.
- [ ] Fase 02 — API mínima, PostGIS, doce frames y treinta y seis condiciones.
- [ ] Fase 03 — renderer de viento WebGL y fallback.
- [ ] Fase 04 — aeropuertos y panel meteorológico.
- [ ] Fase 05 — temperatura y metadata de leyenda.
- [ ] Fase 06 — timeline y controles del visor.
- [ ] Fase 07 — integración vertical y acabado visual.
- [ ] Fase 08 — E2E, rendimiento, despliegue y ensayo.

## Gates operativos

- Una ola parte de `master` solo después de integrar la anterior.
- Una fase usa su propia rama/worktree/PR y respeta ownership.
- Fases 04–06 no editan página, store o controller.
- Fase 07 es el único wiring compartido.
- Fase 08 no añade features; solo corrige bloqueos de aceptación.
- Ola 1 no cierra si falta un frame, una combinación ICAO/timestamp o existe
  generación meteorológica en runtime.

## Recortes congelados

No hay backlog P1 dentro de esta ejecución. Quedan fuera search, picker,
opacity, quality, mobile, dark/light, URL state, auth, comercio y backend no
consumido por el guion.

## Riesgos abiertos

1. Limpieza amplia del template en fase 00.
2. GEOS/GDAL/PostGIS aún no validados.
3. WeatherLayers/WebGL debe superar el gate de fase 03.
4. Basemap/meteorología deben funcionar sin red externa.
5. Autoría manual de assets requiere validación estricta de completitud/coherencia.
6. Equipo `1920×1080`, URL y HTTPS deben confirmarse para fase 08.

## Deuda deliberada

La muestra no pretende ser operacional ni production-ready. Todo hallazgo no
bloqueante se registra después de la reunión y no reabre el alcance actual.
