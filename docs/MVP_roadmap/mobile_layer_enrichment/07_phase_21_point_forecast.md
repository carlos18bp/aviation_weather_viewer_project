# Fase 21 — Exploración meteorológica por punto

## Objetivo

Enriquecer el picker de Fase 10 con una lectura actual y una evolución de seis
timestamps para temperatura, viento, nubosidad, base de nubes, visibilidad y
ráfagas. La feature es controlada, accesible y no realiza requests por cada
movimiento del marcador.

## Ola y dependencias

- **Ola:** M2, paralela con Fases 19, 20 y 22.
- **Requiere:** Ola M1 integrada; contratos/grids de Fase 18 y sampler de Fase 10.
- **Desbloquea:** Fase 23.
- **Requerimientos:** MRF-010; MRNF-004 y MRNF-006 a MRNF-008.
- **No depende:** adapters visuales de Fases 19–20.

## Resultado demostrable aislado

Con descriptores/fixtures inyectados:

1. seleccionar coordenada en Colombia;
2. cargar una serie de seis AviationPointSample;
3. mostrar resumen del timestamp activo;
4. alternar métricas mediante chips de 44 px;
5. seleccionar 09Z en la gráfica y emitir callback;
6. mostrar null de cloud-base como “Sin base significativa”;
7. mover coordenada rápidamente y descartar serie anterior;
8. fallar un producto y conservar el resto con estado parcial/retry.

## Ownership exclusivo

~~~text
frontend/features/weather/point-forecast/**
frontend/components/weather/PointForecast/**
~~~

## Archivos prohibidos

~~~text
frontend/features/weather/picker/**
frontend/features/viewer/**
frontend/components/weather/WeatherPicker/**
frontend/components/weather/ResponsivePanelHost/**
frontend/lib/services/weatherService.ts
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/**
frontend/features/presentation/**
frontend/e2e/**
backend/**
~~~

Consume exports públicos de picker y aviation-layer-contracts sin modificarlos.

## Interfaces

~~~typescript
type PointForecastMetric =
  | "temperature"
  | "wind"
  | "cloud-cover"
  | "cloud-base"
  | "visibility"
  | "wind-gusts";

interface PointForecastSeries {
  coordinate: readonly [number, number];
  points: readonly AviationPointSample[];
}

interface PointForecastProps {
  coordinate: readonly [number, number] | null;
  activeTimestamp: DemoTimestamp;
  series: PointForecastSeries | null;
  activeMetric: PointForecastMetric;
  status: "idle" | "loading" | "partial" | "ready" | "error";
  error: string | null;
  onMetricChange(metric: PointForecastMetric): void;
  onTimestampSelect(timestamp: DemoTimestamp): void;
  onRetry(): void;
  onClose(): void;
}
~~~

El componente no modifica estado global. Fase 23 controla props/callbacks.

## Servicio de serie

- recibe coordenada y descriptor map para los seis timestamps;
- obtiene temperatura/U/V mediante servicios públicos de Fase 10;
- obtiene cuatro grids mediante loader inyectado;
- deduplica promesas por layer/timestamp;
- conserva solo serie activa durante esta fase;
- usa un AbortController por request de serie;
- versiona coordenada para descartar respuestas antiguas;
- no inicia carga durante drag/touchmove;
- inicia al commit de coordenada en touchend/click.

Si un producto secundario falla, devuelve estado partial y null únicamente
para sus métricas. Temperatura y viento forman el mínimo para ready/partial;
si ambos fallan, estado error.

## Visualización

- encabezado con lon/lat a dos decimales y badge simulado;
- resumen activo con seis métricas;
- chips accesibles para cambiar métrica;
- gráfica SVG compacta con seis puntos y eje UTC;
- tabla/lista accesible equivalente a la gráfica;
- punto activo sincronizado visualmente;
- no añade librería de charts;
- reduced motion elimina transiciones de línea/puntos.

Cloud-base null produce gap explícito, no cero. Dirección de viento aparece en
resumen, pero la gráfica de wind representa velocidad.

## Implementación ordenada

1. Crear tipos y state machine idle/loading/partial/ready/error.
2. Implementar builder de AviationPointSample por timestamp.
3. Implementar loader de serie abortable/versionado.
4. Añadir política de resultados parciales.
5. Crear helpers de escala SVG sin dependencia.
6. Implementar PointForecast controlado.
7. Añadir tabla accesible y navegación por teclado.
8. Crear harness con coordenadas/fixtures.
9. Probar carreras, partial, null, retry y cleanup.
10. Entregar callback contract para Fase 23.

## Manejo de errores

- coordenada externa rechaza antes de fetch;
- serie incompleta en timestamps se rechaza o marca partial por producto;
- timestamp activo ausente no publica resumen mezclado;
- cloud-base null es dato válido;
- AbortError no se presenta como fallo;
- retry reutiliza coordenada vigente, no una anterior;
- close aborta carga y libera cache local;
- error de SVG no impide tabla accesible.

## Pruebas dirigidas

- serie exacta de seis timestamps ordenados;
- interpolación/redondeos heredados;
- null cloud-base y gap;
- partial de cada producto;
- temperatura/viento ambos fallidos producen error;
- race coordenada A→B conserva B;
- no fetch durante movimiento;
- click de punto emite timestamp;
- chips/tabla son operables por teclado;
- focus close y retry;
- unmount aborta y descarta respuesta.

## Criterios de aceptación

- [ ] Se muestran seis muestras sincronizadas por coordenada.
- [ ] Resumen activo contiene las seis métricas.
- [ ] Elegir un punto temporal emite callback, no muta store.
- [ ] Null no se presenta como cero.
- [ ] Fallo secundario conserva métricas sanas.
- [ ] Carrera de coordenadas conserva la última.
- [ ] No existe endpoint o request por movimiento.
- [ ] Gráfica tiene alternativa textual accesible.
- [ ] Tests dirigidos pasan.

## Handoff

Entregar loader, state machine, componente, métricas, comportamiento partial,
requisitos de descriptores y harness. Fase 23 conecta coordenada/timestamp,
monta el componente en location panel y coordina cache global acotada.

## Riesgos

- Cargar 6 timestamps × varios productos sin deduplicación dispara demasiados
  requests. Reusar caches/loads y abortar series obsoletas.
- Un gráfico vistoso sin alternativa textual incumple accesibilidad.
- Publicar parcialmente una hora distinta rompe coherencia; la serie se
  construye por timestamp completo antes de emitir cada punto.
