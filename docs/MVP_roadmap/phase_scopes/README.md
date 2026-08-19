# Scopes de ejecución — Demo visual meteorológica de Colombia

Este directorio convierte [`mvp_roadmap.md`](../mvp_roadmap.md) en un plan
ejecutable para la próxima reunión. El roadmap conserva el levantamiento amplio;
estos scopes son el subconjunto que se construirá ahora: una muestra visual,
funcional y convincente de la capacidad de ProjectApp.

La prioridad no es completar una plataforma operacional. La prioridad es que,
al abrir la URL, el cliente reconozca una experiencia meteorológica moderna,
fluida e inspirada en Windy, limitada a Colombia y construida con identidad
propia.

## Cómo usar este paquete

Cada sesión recibe exactamente:

1. este `README.md`;
2. [`00_shared_contracts.md`](00_shared_contracts.md);
3. el archivo de su fase;
4. las instrucciones `AGENTS.md` del repositorio.

Una sesión implementa únicamente su scope. Si necesita cambiar un contrato o
un archivo de otra fase, lo registra en el handoff de su PR; la fase de
integración realiza el cableado compartido.

## Prioridad de producto

Si una restricción de tiempo obliga a recortar, se protege este orden:

1. viento animado alineado con el mapa;
2. temperatura continua sobre Colombia;
3. timeline y selector de capas;
4. aeropuertos y panel compacto;
5. acabados secundarios.

No se sacrificarán la advertencia de simulación, la estabilidad del mapa ni el
fallback de viento.

## Reglas de ejecución paralela

- Una fase equivale a una sesión, rama, worktree y PR.
- Cada ola parte del mismo commit de `master`, después de integrar la ola previa.
- Las fases de una misma ola no tienen dependencias entre sí.
- No se abre una ola posterior mientras queden PRs pendientes de la anterior.
- Los paths exclusivos de una fase no se modifican desde otra fase de la misma ola.
- Las fases 04–06 entregan componentes/adapters sin editar la composición central.
- Las fases 07 y 08 son secuenciales porque integran y validan trabajo compartido.
- Varias ramas se integran con `merge-queue`; nunca se reutiliza una rama ajena.

## Mapa de olas

| Ola | Fases | Gate de entrada | Paralelismo |
|---|---|---|---:|
| 0 | 00 — limpieza y dirección visual | Este paquete aprobado | 1 |
| 1 | 01 mapa, 02 backend/datos, 03 viento | Fase 00 integrada | 3 |
| 2 | 04 aeropuertos, 05 temperatura, 06 controles | Ola 1 integrada | 3 |
| 3 | 07 — integración y acabado | Ola 2 integrada | 1 |
| 4 | 08 — entrega de la demo | Fase 07 integrada | 1 |

## Índice de fases

| Fase | Archivo | Entrega principal |
|---:|---|---|
| 00 | [`01_phase_00_cleanup_visual_freeze.md`](01_phase_00_cleanup_visual_freeze.md) | Starter limpio y dirección visual congelada |
| 01 | [`02_phase_01_map_shell.md`](02_phase_01_map_shell.md) | Mapa fullscreen, controller y store mínimo |
| 02 | [`03_phase_02_minimal_backend_demo_data.md`](03_phase_02_minimal_backend_demo_data.md) | API mínima, PostGIS y assets determinísticos |
| 03 | [`04_phase_03_wind_renderer.md`](04_phase_03_wind_renderer.md) | Partículas WebGL encapsuladas y fallback |
| 04 | [`05_phase_04_airports.md`](05_phase_04_airports.md) | Aeropuertos seleccionables y panel |
| 05 | [`06_phase_05_temperature.md`](06_phase_05_temperature.md) | Campo térmico y leyenda |
| 06 | [`07_phase_06_controls.md`](07_phase_06_controls.md) | Timeline, selector, UTC, warning y reset |
| 07 | [`08_phase_07_integration_visual_polish.md`](08_phase_07_integration_visual_polish.md) | Vertical slice y acabado Windy-inspired |
| 08 | [`09_phase_08_demo_release.md`](09_phase_08_demo_release.md) | Verificación, URL y ensayo de reunión |

## Ownership por ola

### Ola 1

| Fase | Ownership exclusivo |
|---|---|
| 01 | `frontend/map/`, `frontend/lib/stores/weatherViewerStore.ts`, shell base del visor |
| 02 | `backend/weather/`, `backend/media/demo-weather/` y configuración PostGIS |
| 03 | `frontend/map/renderers/wind/`, `frontend/map/layers/wind/` y fixture U/V de tests |

La fase 03 usa el fixture U/V congelado en contratos; no espera assets de fase
02. La fase 07 reemplaza el fixture por las URLs reales.

### Ola 2

| Fase | Ownership exclusivo |
|---|---|
| 04 | `frontend/features/airports/`, `frontend/components/weather/AirportPanel/`, `frontend/map/layers/airport/` |
| 05 | `frontend/features/weather/temperature/`, `frontend/map/layers/temperature/`, leyenda térmica |
| 06 | `frontend/features/timeline/` y controles bajo `frontend/components/weather/` no asignados a otras fases |

## Requerimientos primarios

| Fase | Requerimientos funcionales |
|---|---|
| 01 | RF-001, RF-002, RF-003 |
| 02 | RF-025, RF-026, RF-027, RF-028, RF-029 |
| 03 | RF-009, RF-010, RF-023 |
| 04 | RF-004, RF-005, RF-006, RF-007 |
| 05 | RF-008 |
| 06 | RF-011, RF-012, RF-013, RF-014, RF-015, RF-016, RF-017, RF-018, RF-019, RF-020, RF-024 |
| 07 | RF-021, RF-022, RF-030 |

| Fase | Requerimientos no funcionales |
|---|---|
| 00 | RNF-013, RNF-014 |
| 01 | RNF-005, RNF-006, RNF-011, RNF-015 |
| 02 | RNF-007, RNF-016 |
| 03 | RNF-017 |
| 06 | RNF-010, RNF-018 |
| 08 | RNF-001, RNF-002, RNF-003, RNF-004, RNF-008, RNF-009, RNF-012 |

## Gates entre olas

### Gate de ola 0

- no quedan rutas, dependencias, copy ni servicios funcionales del template;
- existe un único tema oscuro aeronáutico, sin theme switcher;
- frontend y backend compilan/arrancan con placeholders;
- composición `1920×1080` y contratos quedan congelados.

### Gate de ola 1

- mapa local navegable dentro de Colombia;
- API mínima y assets determinísticos verificados;
- renderer de viento funciona con fixture o activa fallback;
- cada PR respeta ownership y puede probarse aislado.

### Gate de ola 2

- aeropuertos, temperatura y controles funcionan como módulos aislados;
- ningún módulo importa internals de otra fase de la ola;
- cada fase entrega props, callbacks o adapter para fase 07.

### Gate de demo

- vertical slice completo en Chrome/Edge a `1920×1080`;
- temperatura, viento y panel reflejan el timestamp visible;
- advertencia permanente y fallback probados;
- ejecución local y URL HTTPS sin APIs/tiles meteorológicos externos;
- ensayo continuo de diez minutos sin errores críticos.

## Fuera de este plan

No se crean fases futuras para búsqueda, picker por coordenada, control de
opacidad, selector de calidad, responsive móvil, dark/light mode, persistencia
en URL, autenticación ni módulos del starter. Si el cliente valida la muestra,
esas capacidades se priorizarán en un roadmap posterior.

## Política de cambios al contrato

Una fase no modifica [`00_shared_contracts.md`](00_shared_contracts.md) en su
rama. Si encuentra un bloqueo, documenta contrato, evidencia, cambio mínimo e
impacto. La corrección se integra antes de abrir la siguiente ola; nunca se
mantienen contratos incompatibles entre sesiones paralelas.
