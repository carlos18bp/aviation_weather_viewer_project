# Mapa de flujos de usuario

Versión: 2.0.0

Actualizado: 2026-08-19

Alcance inspeccionado: Fase 00.

## Inventario real de superficies

| Superficie | Archivo | Estado |
|---|---|---|
| `/` | `frontend/app/page.tsx` | Placeholder público fullscreen |
| Layout raíz | `frontend/app/layout.tsx` | Metadata y documento sin providers |
| Health | `backend/weather/views.py` | API pública; no es una interacción UI |

No existen otras rutas frontend, componentes de navegación, formularios,
stores funcionales, providers, auth ni vistas de comercio.

## Inventario de interacción de `/`

La vista contiene marca, hora fija `06Z`, panel aeroportuario informativo,
placeholder del mapa, leyenda estática, silueta de timeline y warning. La
inspección del JSX confirma:

- cero links o anchors;
- cero buttons, inputs, forms o elementos editables;
- cero handlers, efectos, client state o navegación;
- cero instancia MapLibre, gestures o controles de capa;
- cero estados de loading, error o retry.

Los labels “Capas”, “Controles” y “Timeline” son texto/siluetas no interactivas
para reservar la composición de fases posteriores.

## Resultados por clase

| Clase | Resultado real en Fase 00 | Cobertura |
|---|---|---|
| Success | No aplica: no existe acción iniciada por usuario | Exenta |
| Error | No aplica: no existe input ni request de UI | Exenta |
| Failure | No aplica: no existe dependencia runtime en la vista estática | Exenta |
| Display | Identidad, aviso de mapa futuro y warning permanente | `app/__tests__/page.test.tsx` |

## Registro de flow coverage

| Flow ID | Ruta | Prioridad | Specs esperados | Veredicto |
|---|---|---:|---:|---|
| `viewer-phase-00-placeholder` | `/` | P4 | 0 | Exención deliberada |

`expectedSpecs: 0` es el sentinel canónico para un flujo intencionalmente sin
E2E. Crear un spec `goto + visible` no conduciría una interacción y sería una
prueba basura; por eso el display se valida en la capa frontend-unit.

## Gatillo de actualización

La exención deja de ser válida cuando una fase agregue cualquier control real:
mapa navegable, selección de aeropuerto/capa/timestamp, playback, reset, estados
de error/retry o navegación. Ese cambio debe declarar outcomes y añadir specs
Playwright que conduzcan la interacción a través de la UI.
