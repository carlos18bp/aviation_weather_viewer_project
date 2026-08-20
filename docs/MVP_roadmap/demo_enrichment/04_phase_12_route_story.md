# Fase 12 — Historia aeronáutica sobre ruta

## Objetivo

Construir el elemento diferenciador del demo: seleccionar dos aeropuertos,
trazar una ruta y explicar visualmente cómo incide el viento simulado de la
hora activa mediante componentes de frente/cola y cruzado.

No es un planificador de vuelo ni produce recomendaciones operacionales.

## Ola y dependencias

- **Ola:** E2, paralela con fase 13.
- **Requiere:** ola E1 integrada.
- **Consume:** colección/búsqueda aeroportuaria de fase 09 y sampler de fase 10.
- **Desbloquea:** integración final de fase 14.
- **Requerimientos:** ERF-008, ERF-009, ENF-001, ENF-003 y ENF-005.
- **No depende:** precipitación o isobaras.

## Resultado demostrable aislado

Con aeropuertos y campo U/V `06Z`:

1. seleccionar `SKBO` como origen y `SKRG` como destino;
2. obtener línea geodésica y distancia total en NM;
3. generar 24 muestras ordenadas;
4. calcular bearing, viento longitudinal y cruzado;
5. dibujar línea/segmentos y un perfil compacto;
6. cambiar U/V a `09Z` y recalcular sin request adicional.

La fase 14 conectará selecciones, timestamp, URL y controller.

## Ownership exclusivo

```text
frontend/features/route/**
frontend/map/layers/route/**
frontend/components/weather/RoutePlanner/**
frontend/components/weather/RouteProfile/**
```

No se añade dependencia Turf: la ruta limitada a dos puntos se resuelve con
funciones geodésicas pequeñas, tipadas y probadas.

## Archivos centrales prohibidos

```text
frontend/app/page.tsx
frontend/app/globals.css
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/features/viewer/**
frontend/e2e/flow-definitions.json
backend/**
```

## Alcance incluido

### Selección

- Dos selectores controlados: origen y destino.
- Opciones limitadas a los seis aeropuertos cargados.
- Buscar por ICAO/IATA/nombre reutilizando funciones públicas de fase 09.
- Impedir origen igual a destino.
- Acción invertir ruta.
- Acción limpiar ruta.
- Preset visual recomendado `SKBO → SKRG`, pero no default global.

### Cálculo

- Haversine con radio `3440.065 NM`.
- Interpolación sobre gran círculo entre las coordenadas de aeropuertos.
- Exactamente 24 muestras, incluyendo ambos extremos.
- Bearing local por muestra; la última reutiliza bearing del segmento anterior.
- Muestreo U/V mediante export público de fase 10.
- Proyección longitudinal y transversal en nudos.
- Longitudinal positivo = cola; negativo = frente.
- Conservar signo transversal para indicar lado.
- Resumen: distancia, viento longitudinal medio y cruzado máximo absoluto.
- Redondear solo DTO visible, no cálculos internos.

### Mapa

- Un source GeoJSON contiene línea y puntos de muestra.
- Línea base tenue y segmentos coloreados por viento longitudinal.
- Flechas o marcas espaciadas; nunca una partícula React por muestra.
- Route layer permanece sobre límites y bajo aeropuertos/picker.
- Focus opcional encaja ambos extremos sin romper bounds regionales.
- `setFrameAnalysis()` reemplaza GeoJSON atómicamente.

### Panel

- Mostrar origen/destino, distancia NM y timestamp UTC.
- Badge `Viento de cola` o `Viento de frente` según media.
- Mostrar magnitud media longitudinal y máximo cruzado.
- Perfil horizontal de 24 muestras, compacto y legible.
- Leyenda de color local, sin reutilizar leyenda meteorológica principal.
- Copy permanente `Análisis simulado — no usar para planificación de vuelo`.

## Fuera del alcance

- Waypoints, drag de ruta o selección de coordenadas arbitrarias.
- Rutas ATS, aerovías, espacios aéreos o restricciones.
- Altitud, nivel de vuelo o componente vertical.
- Velocidad de aeronave, ETA, combustible o performance.
- Optimización o recomendación de ruta/hora.
- Persistencia de rutas, múltiples legs o exportación.
- Endpoint backend para cálculos.
- Modificar store/controller/composición.

## Interfaces de entrega

```typescript
interface DemoRoute {
  originIcao: DemoAirportIcao;
  destinationIcao: DemoAirportIcao;
}

interface RouteAnalysisInput {
  route: DemoRoute;
  airports: AirportFeatureCollection;
  timestamp: DemoTimestamp;
  wind: WindField;
}

analyzeRoute(input: RouteAnalysisInput): RouteAnalysis;

interface RouteLayerAdapter {
  initialize(): Promise<void>;
  setAnalysis(analysis: RouteAnalysis | null): void;
  setVisible(visible: boolean): void;
  focus(): void;
  reset(): void;
  destroy(): void;
}

interface RoutePlannerProps {
  airports: AirportFeatureCollection;
  route: DemoRoute | null;
  analysis: RouteAnalysis | null;
  loading: boolean;
  error: string | null;
  onChange(route: DemoRoute | null): void;
  onRetry(): void;
}
```

## Convención matemática

Para un bearing de viaje `θ`, con U positivo al este y V positivo al norte:

```text
eastAxis  = sin(θ)
northAxis = cos(θ)
along     = U * eastAxis + V * northAxis
cross     = U * northAxis - V * eastAxis
```

`along > 0` mueve el aire en dirección del viaje. El signo de `cross` indica
lado según esta convención y debe documentarse en tests; la UI principal muestra
la magnitud para evitar una interpretación operacional.

## Implementación ordenada

1. Crear tipos y validación de ruta con ICAO distintos.
2. Implementar Haversine y bearing con fixtures geodésicos conocidos.
3. Implementar interpolación de 24 puntos sobre gran círculo.
4. Proyectar U/V y producir `RouteAnalysis` puro.
5. Probar ruta inversa, campo constante y campo cruzado conocido.
6. Crear conversor de analysis a GeoJSON.
7. Crear adapter MapLibre con IDs reservados y cleanup.
8. Crear selectores controlados reutilizando búsqueda pública.
9. Crear panel/perfil SVG sin dependencia de charts.
10. Añadir estados vacío, loading, error, retry e invertir.
11. Verificar layout aislado y rendimiento al recalcular varios timestamps.
12. Entregar callbacks y ejemplo de wiring para fase 14.

## Manejo de errores

- Ruta con ICAO desconocido o iguales se rechaza antes de calcular/dibujar.
- Aeropuerto sin coordenada válida produce error recuperable.
- Muestra fuera de cobertura invalida análisis completo; no clampa.
- U/V faltante conserva última ruta visible con indicador desactualizado o la
  oculta según decida fase 14; nunca mezcla timestamp.
- Cambiar route/timestamp usa versión de request/cálculo y descarta resultado
  obsoleto.
- Limpiar ruta elimina GeoJSON y panel, no aeropuerto seleccionado.
- Destroy elimina layers en orden inverso, source y listeners.

## Pruebas dirigidas

### Unitarias

- Haversine con distancia conocida y ruta inversa;
- 24 puntos incluyen extremos y mantienen orden;
- bearing finito en todos los segmentos;
- campo a favor produce `along > 0` y cross cercano a cero;
- campo contrario produce `along < 0`;
- campo perpendicular produce cross esperado;
- resumen usa media/máximo correctos;
- ICAO iguales, desconocidos y coordenadas inválidas se rechazan.

### Componentes/adapters

- seleccionar origen/destino emite una ruta válida;
- invertir intercambia códigos una vez;
- limpiar emite `null`;
- panel presenta NM, kt, UTC y disclaimer;
- adapter crea/actualiza/limpia GeoJSON sin duplicar resources;
- destroy idempotente y focus respeta bounds.

No crear E2E en esta fase.

## Criterios de aceptación

- [ ] `SKBO → SKRG` produce distancia y 24 muestras determinísticas.
- [ ] Origen y destino iguales nunca generan línea.
- [ ] Cambiar campo U/V recalcula todos los valores.
- [ ] Frente, cola y cruzado siguen la convención congelada.
- [ ] El mapa no usa componentes React por punto.
- [ ] Perfil y resumen indican timestamp/unidades/simulación.
- [ ] No se añadieron dependencias geoespaciales ni endpoints.
- [ ] Fallo de análisis no rompe mapa o timeline original.
- [ ] Adapter libera layers/source/listeners.
- [ ] Tests dirigidos pasan y no se editó wiring central.

## Handoff a fase 14

Entregar exports matemáticos, forma del GeoJSON, IDs de source/layers, colores,
contratos de props/callbacks, preset de demostración, comandos de prueba y
criterio exacto para distinguir frente/cola.

## Riesgos

- El viento relativo depende del sentido de viaje; una convención ambigua
  produciría una demostración incorrecta. Fixtures vectoriales conocidos son
  obligatorios.
- El panel no debe parecer una herramienta certificada. Copy, unidades y
  disclaimer tienen el mismo peso que el gráfico.
