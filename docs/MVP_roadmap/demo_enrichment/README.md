# Roadmap de enriquecimiento — Demo meteorológica aeronáutica

Este paquete comienza después de la fase 08. No amplía el MVP base antes de la
reunión ni convierte el visor en una plataforma operacional: organiza una
segunda iteración destinada exclusivamente a aumentar el impacto visual y la
capacidad demostrable de ProjectApp.

El resultado buscado combina dos sensaciones:

- la exploración visual, temporal y cartográfica que inspira Windy;
- una historia aeronáutica propia, centrada en aeropuertos y viento sobre ruta.

Todo continúa limitado a Colombia, a la fecha ficticia `2026-01-15` y al
escenario determinístico `demo-colombia-001`. Los nuevos datos también serán
simulados, locales y explícitamente no operacionales.

## Condición de entrada

No iniciar la fase 09 hasta que:

1. la fase 08 esté integrada en la base resuelta;
2. el recorrido original esté verde y desplegado;
3. exista una captura y una medición base de rendimiento;
4. no queden PR funcionales de las fases 00–08 pendientes de merge.

Este gate evita usar las fases de enriquecimiento para corregir una demo base
incompleta.

## Cómo usar este paquete

Cada sesión recibe exactamente:

1. este `README.md`;
2. [`00_shared_contracts.md`](00_shared_contracts.md);
3. el scope de su fase;
4. `AGENTS.md` y las reglas locales del repositorio.

Una fase equivale a una sesión, rama, worktree y PR. Las fases paralelas
entregan módulos y adapters aislados; no editan la composición central. La fase
14 es la única autorizada a realizar el wiring transversal.

## Prioridad de producto

Ante una restricción de tiempo, proteger este orden:

1. picker por coordenada y evolución del aeropuerto;
2. ruta aeronáutica con viento relativo;
3. precipitación e isobaras;
4. escenas compartibles y modo presentación;
5. microanimaciones decorativas.

No se sacrificarán el warning, la coherencia temporal, el fallback de viento,
la ejecución local ni la ausencia de servicios meteorológicos externos.

## Candidatos evaluados

| Candidato | Valor para la demo | Costo/riesgo | Decisión |
|---|---:|---:|---|
| Búsqueda ICAO, IATA, nombre y ciudad | Alto | Bajo | Fase 09 |
| Evolución del tiempo por aeropuerto | Muy alto | Bajo | Fase 09 |
| Picker meteorológico por coordenada | Muy alto | Medio | Fase 10 |
| Precarga y timeline más expresivo | Alto | Medio | Fase 11 |
| Escena reproducible mediante URL | Alto | Bajo | Fase 11 |
| Modo presentación sin distracciones | Alto | Bajo | Fase 11 |
| Ruta visual entre dos aeropuertos | Muy alto | Medio | Fase 12 |
| Viento de frente, cola y cruzado | Muy alto | Medio-alto | Fase 12 |
| Precipitación simulada | Muy alto | Medio | Fase 13 |
| Isobaras de presión simuladas | Alto | Medio | Fase 13 |
| Nubosidad, niebla y visibilidad | Alto | Medio-alto | Backlog posterior |
| Niveles de vuelo | Alto | Alto | Backlog posterior |
| Control manual de opacidad/calidad | Bajo | Bajo | Postergado por ruido visual |
| Adaptación completa a móvil | Bajo para la reunión | Alto | Fuera de esta iteración |
| Comparación de modelos | Medio | Alto | Excluido: falsa precisión científica |
| Radar, satélite, METAR y TAF | Alto | Crítico | Excluido: requiere datos reales |
| Globo 3D o terreno avanzado | Medio | Alto | Excluido: no mejora el guion principal |
| Dark/light mode | Nulo | Bajo | Excluido |
| Autenticación, favoritos o perfiles | Nulo | Alto | Excluido |

La lista toma como referencia patrones públicos de Windy —
[picker](https://api.windy.com/map-forecast/tutorials/picker),
[estado en URL](https://community.windy.com/topic/77/windy-com-url-parameters/1),
[route planner](https://community.windy.com/topic/9013/windy-launches-route-planner)
y [capas meteorológicas](https://api.windy.com/map-forecast/pricing)— sin
integrar su API, depender de su servicio ni copiar su interfaz.

## Mapa de olas

| Ola | Fases | Gate de entrada | Ejecución |
|---|---|---|---|
| E1 | 09 aeropuertos, 10 picker, 11 presentación | Fase 08 integrada | 3 sesiones paralelas |
| E2 | 12 ruta, 13 capas atmosféricas | Ola E1 integrada | 2 sesiones paralelas |
| E2 cierre | 14 integración y release | Fases 12–13 integradas | 1 sesión secuencial |

La fase 14 es el carril de cierre de E2, no una tercera ola de funcionalidades.

```text
Fase 08 integrada
        │
        ├────────────┬────────────┐
        ▼            ▼            ▼
   Fase 09       Fase 10       Fase 11
   aeropuertos   picker         presentación
        └────────────┬────────────┘
                     ▼
                Gate ola E1
                     │
              ┌──────┴──────┐
              ▼             ▼
          Fase 12        Fase 13
          ruta           atmósfera
              └──────┬──────┘
                     ▼
                  Fase 14
               integración/QA
```

## Índice de fases

| Fase | Archivo | Entrega principal |
|---:|---|---|
| 09 | [`01_phase_09_airport_intelligence.md`](01_phase_09_airport_intelligence.md) | Búsqueda y evolución simulada por aeropuerto |
| 10 | [`02_phase_10_weather_picker.md`](02_phase_10_weather_picker.md) | Picker y muestreo local de temperatura/viento |
| 11 | [`03_phase_11_temporal_presentation.md`](03_phase_11_temporal_presentation.md) | Precarga, URL y modo presentación |
| 12 | [`04_phase_12_route_story.md`](04_phase_12_route_story.md) | Ruta entre aeropuertos y viento relativo |
| 13 | [`05_phase_13_atmospheric_layers.md`](05_phase_13_atmospheric_layers.md) | Precipitación e isobaras simuladas |
| 14 | [`06_phase_14_integration_release.md`](06_phase_14_integration_release.md) | Vertical slice enriquecido, QA y ensayo |

## Ownership por ola

### Ola E1

| Fase | Ownership exclusivo |
|---|---|
| 09 | `frontend/features/airports/search/`, `frontend/features/airports/trend/`, `AirportSearch/`, `AirportTrend/` y extensión del servicio aeroportuario |
| 10 | grids escalares de temperatura, generación/validación asociada, `frontend/features/weather/picker/` y `frontend/map/layers/picker/` |
| 11 | `frontend/features/presentation/`, `frontend/features/timeline/` y componentes propios de presentación |

Las fases 09–11 no editan `page.tsx`, el store central,
`WeatherMapController.ts`, el orquestador del visor ni los flows E2E. Entregan
props, callbacks, codecs y adapters para que la fase 14 los conecte.

### Ola E2

| Fase | Ownership exclusivo |
|---|---|
| 12 | `frontend/features/route/`, `frontend/map/layers/route/` y componentes de ruta |
| 13 | assets/API de precipitación e isobaras, `frontend/features/weather/precipitation/`, `frontend/features/weather/isobars/` y sus adapters |

La fase 12 consume contratos públicos de las fases 09–10. La fase 13 puede
extender el manifiesto ya integrado, pero no modifica picker, aeropuertos ni
ruta. Ninguna de las dos edita la composición central.

### Cierre E2

La fase 14 tiene ownership temporal sobre:

```text
frontend/app/page.tsx
frontend/app/globals.css
frontend/features/viewer/**
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/e2e/flow-definitions.json
docs/USER_FLOW_MAP.md
```

No reimplementa los módulos entregados por fases anteriores.

## Requerimientos por fase

| Fase | Requerimientos funcionales | Requerimientos no funcionales |
|---:|---|---|
| 09 | ERF-001, ERF-002 | ENF-003, ENF-006 |
| 10 | ERF-003, ERF-004 | ENF-001, ENF-002, ENF-005 |
| 11 | ERF-005, ERF-006, ERF-007 | ENF-003, ENF-004, ENF-006 |
| 12 | ERF-008, ERF-009 | ENF-001, ENF-003, ENF-005 |
| 13 | ERF-010, ERF-011 | ENF-001, ENF-002, ENF-005 |
| 14 | ERF-012 | ENF-001 a ENF-007 |

Los contratos e IDs normativos se definen en
[`00_shared_contracts.md`](00_shared_contracts.md).

## Gate de la ola E1

- búsqueda y tendencia funcionan con fixtures o harness aislado;
- el picker distingue coordenada válida, fuera de cobertura y dato fallido;
- los seis grids numéricos son determinísticos y pasan validación;
- el codec de URL acepta únicamente valores del escenario congelado;
- precarga y transiciones no publican timestamps mezclados;
- cada PR respeta ownership y pasa sus pruebas dirigidas;
- los tres PR están integrados antes de cortar fases 12–13.

## Gate de la ola E2

- la ruta calcula distancia y componentes de viento con fixtures conocidos;
- origen y destino nunca son iguales;
- precipitación contiene seis frames visibles y repetibles;
- isobaras contienen seis GeoJSON válidos y liberan sources/listeners;
- fallar un overlay no inutiliza la capa principal;
- ambos PR están integrados antes de comenzar la fase 14.

## Gate del demo enriquecido

- el recorrido original de fase 08 sigue pasando;
- búsqueda, picker, ruta, precipitación e isobaras forman un recorrido coherente;
- aeropuerto, picker, ruta, leyenda, campo y hora comparten timestamp;
- una URL válida restaura la escena y una inválida vuelve a defaults seguros;
- reset vuelve a viento `06Z`, cámara inicial y sin selecciones ni overlays;
- warning y flags de simulación permanecen visibles/presentes;
- no existen requests meteorológicas o cartográficas externas;
- Chrome y Edge sostienen la composición a `1920×1080`;
- diez minutos de uso no presentan crash ni crecimiento continuo de memoria;
- `qa`, quality gate y checks dirigidos quedan verdes.

## Política de integración y conflictos

- Cada ola parte del mismo SHA después de integrar por completo la anterior.
- Los contratos compartidos no se editan desde las fases funcionales.
- Un cambio necesario al contrato se documenta en el handoff; se resuelve antes
  de abrir la siguiente ola.
- Una fase no importa internals de otra: consume exports públicos.
- Varias ramas se drenan con `merge-queue`; nunca se reutiliza una rama ajena.
- Los archivos centrales permanecen reservados para la fase 14.

## Fuera de este roadmap

No se incluyen datos reales, nuevas fechas, más aeropuertos, niveles verticales,
modelos comparables, radar, satélite, productos aeronáuticos oficiales,
optimización de vuelo, combustible, ETA operacional, auth, roles, temas,
responsive móvil completo ni infraestructura productiva.

## Prompt base para cada sesión

```text
Implementa únicamente la fase asignada del roadmap de enriquecimiento.
Lee AGENTS.md, demo_enrichment/README.md, 00_shared_contracts.md y el scope de
tu fase. Respeta su ownership; no edites la composición central ni contratos
congelados. Trabaja en rama/worktree propios, ejecuta las pruebas dirigidas y
entrega PR con handoff explícito para la fase 14. Todos los datos deben seguir
siendo simulados, determinísticos, locales y no operacionales.
```
