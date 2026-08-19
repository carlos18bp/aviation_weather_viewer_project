# Scopes de ejecución por fases — Aviation Weather Viewer MVP

Este directorio convierte [`mvp_roadmap.md`](../mvp_roadmap.md) en unidades de
trabajo que pueden asignarse a sesiones independientes. El roadmap original
continúa siendo la fuente funcional; estos archivos definen cómo ejecutarlo sin
mezclar ownership ni obligar a que varias ramas editen la composición central.

## Cómo usar este paquete

Cada sesión recibe exactamente:

1. este `README.md`;
2. [`00_shared_contracts.md`](00_shared_contracts.md);
3. el archivo de su fase;
4. las instrucciones `AGENTS.md` del repositorio.

Una sesión no debe implementar requisitos de otra fase aunque parezcan cambios
pequeños. Si detecta una necesidad fuera de su scope, la documenta en el handoff
de su PR. La fase de integración resolverá el cableado compartido.

## Reglas de ejecución

- Una fase equivale a una sesión, rama, worktree y PR.
- Cada ola parte del mismo commit de `master`, después de integrar por completo
  la ola anterior.
- Las fases de una misma ola no dependen entre sí.
- No se inicia una ola posterior con PRs pendientes de una ola anterior.
- Los paths marcados como exclusivos no pueden ser modificados por otra fase de
  la misma ola.
- `frontend/app/page.tsx`, el store central y `WeatherMapController` solo pueden
  ser cableados por las fases que los tienen asignados explícitamente.
- El primer push debe abrir el PR con las líneas `Sesión:` e `Intención:` que
  exige `AGENTS.md`.
- La integración de varias ramas se drena con `merge-queue`; ninguna sesión
  reutiliza la rama de otra.

## Mapa de olas

| Ola | Fases ejecutables | Gate para comenzar | Paralelismo |
|---|---|---|---:|
| 0 | Fase 00 — baseline del producto | Roadmap aprobado | 1 |
| 1 | Fases 01, 02 y 03 | Fase 00 integrada | 3 |
| 2 | Fases 04, 05, 06 y 07 | Toda la ola 1 integrada | 4 |
| 3 | Fase 08 — integración vertical | Toda la ola 2 integrada | 1 |
| 4 | Fase 09 — resiliencia y rendimiento | Fase 08 integrada | 1 |
| 5 | Fase 10 — validación y despliegue | Fase 09 integrada | 1 |
| 6 (P1) | Fases 11 y 12 | MVP P0 aceptado | 2 |
| 7 (P1) | Fase 13 | Toda la ola 6 integrada | 1 |

Las olas 6 y 7 son opcionales. No forman parte de la definición de listo del MVP
P0 ni pueden retrasar su presentación.

## Índice de fases

| Fase | Archivo | Entrega principal |
|---:|---|---|
| 00 | [`01_phase_00_template_baseline.md`](01_phase_00_template_baseline.md) | Template limpio, identidad y contratos listos |
| 01 | [`02_phase_01_frontend_gis_foundation.md`](02_phase_01_frontend_gis_foundation.md) | Mapa estable, controller, store y puertos GIS |
| 02 | [`03_phase_02_backend_geospatial_api.md`](03_phase_02_backend_geospatial_api.md) | PostGIS, modelos y API pública v1 |
| 03 | [`04_phase_03_simulated_weather_pipeline.md`](04_phase_03_simulated_weather_pipeline.md) | Seis frames determinísticos versionados |
| 04 | [`05_phase_04_airports_experience.md`](05_phase_04_airports_experience.md) | Aeropuertos seleccionables y panel |
| 05 | [`06_phase_05_temperature_visualization.md`](06_phase_05_temperature_visualization.md) | Campo de temperatura georreferenciado |
| 06 | [`07_phase_06_wind_webgl.md`](07_phase_06_wind_webgl.md) | Partículas WebGL y fallback |
| 07 | [`08_phase_07_viewer_controls.md`](08_phase_07_viewer_controls.md) | Timeline, selector, leyenda, warning y reset |
| 08 | [`09_phase_08_vertical_integration.md`](09_phase_08_vertical_integration.md) | Vertical slice sincronizado de punta a punta |
| 09 | [`10_phase_09_resilience_performance.md`](10_phase_09_resilience_performance.md) | Rendimiento, memoria y recuperación |
| 10 | [`11_phase_10_validation_deployment.md`](11_phase_10_validation_deployment.md) | URL, HTTPS, pruebas y ensayo demostrativo |
| 11 | [`12_phase_11_p1_search_picker.md`](12_phase_11_p1_search_picker.md) | Búsqueda y picker opcionales |
| 12 | [`13_phase_12_p1_visual_controls.md`](13_phase_12_p1_visual_controls.md) | Controles gráficos y responsive opcionales |
| 13 | [`14_phase_13_p1_url_state.md`](14_phase_13_p1_url_state.md) | Estado compartible por URL |

## Ownership por ola

### Ola 1

| Fase | Ownership exclusivo |
|---|---|
| 01 | `frontend/map/`, `frontend/lib/stores/weatherViewerStore.ts`, shell del visor |
| 02 | `backend/weather/` excepto `generators/` y `management/commands/generate_demo_weather.py` |
| 03 | `backend/weather/generators/`, comando generador y `backend/media/demo-weather/` |

### Ola 2

| Fase | Ownership exclusivo |
|---|---|
| 04 | `frontend/features/airports/`, `frontend/components/weather/AirportPanel/`, `frontend/map/layers/airport/` |
| 05 | `frontend/features/weather/temperature/`, `frontend/map/layers/temperature/` |
| 06 | `frontend/features/weather/wind/`, `frontend/map/layers/wind/`, `frontend/map/renderers/wind/` |
| 07 | `frontend/features/timeline/` y controles en `frontend/components/weather/` no asignados a AirportPanel |

Las fases de ola 2 entregan módulos y adapters aislados. No los registran en la
página ni modifican el store/controller compartido.

## Matriz canónica de requerimientos P0

“Primaria” significa que esa fase es responsable de demostrar y probar el
requerimiento. Otras fases pueden consumir el comportamiento sin duplicar su
ownership.

| Fase primaria | Requerimientos funcionales |
|---|---|
| 01 | RF-001, RF-002, RF-003 |
| 04 | RF-004, RF-005, RF-006, RF-007 |
| 05 | RF-008 |
| 06 | RF-009, RF-010, RF-023 |
| 07 | RF-011, RF-012, RF-013, RF-014, RF-015, RF-016, RF-017, RF-018, RF-019, RF-020, RF-024 |
| 08 | RF-021, RF-022, RF-030 |
| 03 | RF-025 |
| 02 | RF-026, RF-027, RF-028, RF-029 |

| Fase primaria | Requerimientos no funcionales |
|---|---|
| 09 | RNF-001, RNF-002, RNF-003, RNF-004 |
| 01 | RNF-005, RNF-006, RNF-011, RNF-015 |
| 03 | RNF-007 |
| 10 | RNF-008, RNF-009, RNF-012 |
| 07 | RNF-010 |
| 00 | RNF-013, RNF-014 |
| 02 | RNF-016 |
| 06 | RNF-017 |
| 08 | RNF-018 |

## Gates entre olas

### Gate de ola 0

- template de comercio retirado;
- frontend y backend compilan/arrancan con un placeholder;
- PostgreSQL/PostGIS y CI preparados;
- contratos de este directorio sin decisiones abiertas.

### Gate de ola 1

- mapa local navegable con API de controller estable;
- endpoints backend contract-tested;
- archivos simulados reproducibles y con checksums;
- cada PR integrado sin alterar ownership de otra fase.

### Gate de ola 2

- módulos de aeropuerto, temperatura, viento y controles probados en aislamiento;
- ningún módulo depende de imports privados de otro módulo de ola 2;
- cada módulo entrega un adapter o callback documentado para la fase 08.

### Gate de MVP P0

- vertical slice completo y sincronizado;
- validación de rendimiento y memoria aprobada;
- ejecución local y URL HTTPS verificadas;
- demostración funcional sin llamadas externas;
- advertencia de simulación siempre visible;
- fallback de viento probado;
- ensayo continuo de diez minutos sin errores críticos.

## Política de cambios al contrato

Si una fase detecta que `00_shared_contracts.md` es inviable, no lo modifica en
su rama. Debe registrar en el PR:

1. contrato afectado;
2. evidencia reproducible;
3. cambio mínimo propuesto;
4. fases impactadas.

El cambio se resuelve y se integra antes de abrir la siguiente ola. Nunca se
mantienen dos contratos incompatibles entre ramas paralelas.
