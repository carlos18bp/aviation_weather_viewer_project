# Contratos compartidos — Enriquecimiento del demo

Este documento congela la frontera técnica de las fases 09–14. Extiende los
contratos del demo base; no cambia su identidad, cobertura, fecha, advertencia
ni naturaleza simulada.

Una fase funcional no modifica este archivo. Si descubre un bloqueo, entrega
evidencia y una propuesta mínima en su handoff. El contrato se corrige entre
olas, nunca en dos ramas paralelas.

## Identidad heredada

| Propiedad | Valor |
|---|---|
| Producto | Meteorología Aeronáutica · Demo ProjectApp |
| Escenario | `demo-colombia-001` |
| Fecha | `2026-01-15` |
| Cobertura WGS84 | `[-82, -5, -66, 14]` |
| Timestamps | `00Z`, `03Z`, `06Z`, `09Z`, `12Z`, `15Z` |
| Vista inicial | `[-73.5, 4.5]`, zoom `4.7` |
| Estado inicial | viento, `06Z`, sin selección ni overlay |
| Viewport objetivo | `1920×1080`, Chrome y Edge |
| Fuente | simulada, determinística, local y versionada |
| Uso operacional | `false` |

Warning inmutable:

```text
DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL
```

No se deriva fecha o timestamp del reloj del sistema.

## Requerimientos funcionales

| ID | Requerimiento |
|---|---|
| ERF-001 | Buscar los seis aeropuertos por ICAO, IATA, nombre o ciudad y enfocarlos en el mapa. |
| ERF-002 | Mostrar la evolución simulada de un aeropuerto durante los seis timestamps. |
| ERF-003 | Seleccionar, mover y cerrar un picker dentro de la cobertura de Colombia. |
| ERF-004 | Mostrar temperatura, velocidad y dirección del viento de la coordenada seleccionada. |
| ERF-005 | Precargar frames adyacentes y ofrecer progreso temporal más expresivo sin mezclar timestamps. |
| ERF-006 | Serializar y restaurar una escena válida desde la URL. |
| ERF-007 | Activar un modo presentación que reduzca chrome secundario sin ocultar el warning. |
| ERF-008 | Trazar una ruta entre dos aeropuertos distintos y mostrar distancia en NM. |
| ERF-009 | Calcular viento de frente/cola y cruzado a lo largo de la ruta para el timestamp activo. |
| ERF-010 | Añadir seis frames locales de precipitación simulada. |
| ERF-011 | Añadir seis overlays locales de isobaras simuladas. |
| ERF-012 | Integrar las funciones anteriores con reset, errores, URL, timeline y recorrido original. |

## Requerimientos no funcionales

| ID | Requerimiento |
|---|---|
| ENF-001 | Todo dato nuevo incluye `is_simulated: true` y `operational_use: false`. |
| ENF-002 | Assets y respuestas son determinísticos y reproducibles entre ambientes. |
| ENF-003 | El visor no consulta servicios meteorológicos/cartográficos externos. |
| ENF-004 | Ninguna transición publica simultáneamente estados de timestamps diferentes. |
| ENF-005 | Fallar una mejora conserva utilizable el recorrido original de fase 08. |
| ENF-006 | Controles nuevos son operables por teclado y respetan reduced motion. |
| ENF-007 | La experiencia permanece estable durante diez minutos y cercana a 30 FPS en el equipo objetivo. |

## Dataset final

```text
backend/media/demo-weather/demo-colombia-001/
├── manifest.json
├── airport-weather.json
├── temperature/
│   ├── 00Z.webp ... 15Z.webp
├── temperature-values/
│   ├── 00Z.json ... 15Z.json
├── wind/
│   ├── 00Z.json ... 15Z.json
├── precipitation/
│   ├── 00Z.webp ... 15Z.webp
└── pressure-isobars/
    ├── 00Z.geojson ... 15Z.geojson
```

Los doce assets existentes no se renombran. Las fases nuevas agregan dieciocho
archivos; no duplican el escenario ni introducen otra fecha.

## Evolución del manifiesto

La fase 10 eleva `schema_version` de `1` a `2`. En ese momento:

- temperatura agrega `value_data_path`;
- viento conserva exactamente su `data_path`;
- `overlays` existe como arreglo vacío;
- las dos capas originales permanecen iguales.

La fase 13, sobre schema 2, agrega precipitación y llena `overlays`. No vuelve a
cambiar la versión.

Forma final:

```typescript
interface DemoManifestV2 {
  schema_version: 2;
  scenario: {
    code: "demo-colombia-001";
    name: string;
    scenario_date: "2026-01-15";
    bbox: [-82, -5, -66, 14];
    seed: 20260115;
    is_simulated: true;
    operational_use: false;
  };
  airport_weather_path: "airport-weather.json";
  layers: Array<{
    id: "temperature" | "wind" | "precipitation";
    name: string;
    kind: "scalar" | "vector";
    unit: "°C" | "kt" | "mm/h";
    minimum: number;
    maximum: number;
  }>;
  timestamps: string[];
  frames: Array<{
    layer: "temperature" | "wind" | "precipitation";
    timestamp: string;
    data_path: string;
    value_data_path?: string;
    minimum: number;
    maximum: number;
  }>;
  overlays: Array<{
    id: "pressure-isobars";
    name: "Isobaras";
    unit: "hPa";
    frames: Array<{
      timestamp: string;
      data_path: string;
    }>;
  }>;
}
```

Solo temperatura puede tener `value_data_path` en este roadmap. Su ausencia en
un frame térmico es un manifiesto inválido; su presencia en viento o
precipitación también lo es.

## Grid escalar de temperatura

Cada JSON de `temperature-values/` cumple:

```typescript
interface TemperatureValueGrid {
  scenario: "demo-colombia-001";
  layer: "temperature";
  width: 128;
  height: 160;
  bbox: [-82, -5, -66, 14];
  unit: "°C";
  timestamp: string;
  is_simulated: true;
  operational_use: false;
  no_data_value: null;
  values: number[];
}
```

- `values.length === 128 * 160`.
- Orden row-major, norte a sur y oeste a este.
- Todos los valores son finitos y están entre `0` y `38`.
- Se evalúa la misma función determinística que genera el WebP.
- El valor muestreado debe corresponder visualmente con el color del raster;
  una diferencia de discretización de hasta `0.5 °C` es aceptable.

## API final

No se crean endpoints por click ni para cálculos de ruta. Se extienden los
endpoints actuales:

```http
GET /api/v1/demo/weather/catalog
GET /api/v1/demo/weather/frames?layer={layer}&timestamp={iso}
GET /api/v1/airports
GET /api/v1/demo/airports/{icao}/weather?timestamp={iso}
```

El catálogo agrega `precipitation` y una colección `overlays`. El endpoint de
frames acepta las tres capas. Para temperatura devuelve además:

```json
{
  "data_url": "/media/demo-weather/demo-colombia-001/temperature/06Z.webp",
  "value_data_url": "/media/demo-weather/demo-colombia-001/temperature-values/06Z.json"
}
```

Viento y precipitación no devuelven `value_data_url`. Las isobaras se resuelven
desde el descriptor del catálogo, con una URL por timestamp. Todas las rutas
son same-origin, relativas y validadas contra traversal.

Forma pública exacta del overlay en catálogo:

```typescript
interface OverlayCatalogDefinition {
  id: "pressure-isobars";
  name: "Isobaras";
  unit: "hPa";
  frames: Array<{
    timestamp: string;
    data_url: string;
  }>;
}
```

`weather_catalog` transforma cada `data_path` interno en `data_url`; nunca
expone rutas del filesystem. Los seis timestamps deben aparecer en el mismo
orden canónico del catálogo.

Errores existentes se conservan. Schema, grid o GeoJSON inválidos producen
`asset_unavailable` y `503`; layer/timestamp inválidos producen `400`.

## Muestreo por coordenada

```typescript
type Coordinate = readonly [longitude: number, latitude: number];

interface WeatherSample {
  coordinate: Coordinate;
  timestamp: string;
  temperatureC: number;
  windSpeedKt: number;
  windDirectionDeg: number;
  is_simulated: true;
  operational_use: false;
}
```

Reglas:

1. comprobar primero que el punto esté dentro de `[-82, -5, -66, 14]`;
2. no usar el clamp actual de `sampleWindField` para puntos externos;
3. interpolar bilinealmente U, V y temperatura en el navegador;
4. calcular `speed = sqrt(u² + v²)`;
5. reportar dirección meteorológica de procedencia:
   `atan2(-u, -v)` normalizada a `0–359°`;
6. redondear temperatura y velocidad a un decimal y dirección a entero;
7. no realizar un request nuevo mientras se arrastra el marcador.

El picker conserva en memoria únicamente los grids del timestamp activo y los
adyacentes precargados. Cambiar timestamp invalida resultados obsoletos.

## Búsqueda y tendencia aeroportuaria

La búsqueda opera sobre el `FeatureCollection` ya cargado. Normaliza trim,
minúsculas y diacríticos; compara ICAO, IATA, nombre y ciudad. Con seis
aeropuertos no requiere índice, endpoint ni debounce de red.

```typescript
interface AirportTrendPoint {
  timestamp: string;
  temperatureC: number;
  windSpeedKt: number;
  windDirectionDeg: number;
  visibilityKm: number;
  pressureHpa: number;
}
```

La serie se construye consultando una vez las seis condiciones del aeropuerto
seleccionado y se cachea por ICAO durante la sesión. No se persiste.

## Estado final del frontend

```typescript
type WeatherLayerId = "temperature" | "wind" | "precipitation";

interface MapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface DemoRoute {
  originIcao: DemoAirportIcao;
  destinationIcao: DemoAirportIcao;
}

interface EnrichedWeatherViewerState {
  selectedCoordinate: Coordinate | null;
  selectedRoute: DemoRoute | null;
  isobarsVisible: boolean;
  presentationMode: boolean;
  mapViewport: MapViewport;
}
```

Estos campos se agregan al store existente; no reemplazan
`activeLayer`, `activeTimestamp`, `selectedAirport` ni los estados de carga.
El store continúa serializable y nunca guarda MapLibre, imágenes, U/V, grids,
AbortControllers, timers o caches.

## Controller y adapters

Extensión final de `WeatherMapController`:

```typescript
interface WeatherMapController {
  setLayer(layerId: WeatherLayerId): void;
  setSelectedCoordinate(coordinate: Coordinate | null): void;
  setRoute(route: DemoRoute | null): void;
  setIsobarsVisible(visible: boolean): void;
  setViewport(viewport: MapViewport): void;
}
```

Callbacks del controller:

```typescript
interface WeatherMapInteractionCallbacks {
  onCoordinateSelected?(coordinate: Coordinate): void;
  onViewportChanged?(viewport: MapViewport): void;
}
```

- click sobre aeropuerto conserva precedencia y no abre picker;
- click sobre el fondo dentro de cobertura selecciona coordenada;
- `moveend`, no `move`, publica viewport para URL;
- listeners se registran una vez y se eliminan en `destroy()`;
- picker, ruta e isobaras usan adapters independientes;
- React no manipula sources o layers directamente.

IDs reservados:

```text
weather-picker-source
weather-picker-point
weather-route-source
weather-route-line
weather-route-samples
weather-precipitation-source
weather-precipitation-layer
weather-pressure-isobars-source
weather-pressure-isobars-lines
weather-pressure-isobars-labels
```

## URL de escena

Contrato canónico:

```text
?layer=wind&t=06Z&lat=4.70&lon=-74.15&z=6.2
&airport=SKBO&picker=-74.15,4.70
&route=SKBO-SKRG&isobars=1&mode=present
```

| Parámetro | Valores válidos | Default/acción inválida |
|---|---|---|
| `layer` | `wind`, `temperature`, `precipitation` | `wind` |
| `t` | `00Z`, `03Z`, `06Z`, `09Z`, `12Z`, `15Z` | `06Z` |
| `lat` | `-7` a `16` | `4.5` |
| `lon` | `-84` a `-64` | `-73.5` |
| `z` | `4` a `9` | `4.7` |
| `airport` | los seis ICAO | sin selección |
| `picker` | `lon,lat` dentro del bbox meteorológico | sin picker |
| `route` | `ORIGEN-DESTINO`, ICAO distintos | sin ruta |
| `isobars` | `1` | desactivadas |
| `mode` | `present` | modo normal |

- El orden de serialización es el de la tabla.
- Se omiten valores default y estados nulos.
- Se usa `history.replaceState`, con debounce de `250 ms` después de
  `moveend`; nunca se crea una entrada por pan.
- El primer bootstrap parsea URL antes de solicitar frames.
- Restaurar URL no ejecuta animaciones de focus aeropuerto.
- Parámetros desconocidos se ignoran y no se vuelven a serializar.

## Ruta y viento relativo

La ruta conecta coordenadas conocidas de dos aeropuertos. No admite waypoints,
drag, rutas arbitrarias ni optimización.

```typescript
interface RouteWindSample {
  coordinate: Coordinate;
  distanceNm: number;
  bearingDeg: number;
  windSpeedKt: number;
  alongWindKt: number;
  crossWindKt: number;
}

interface RouteAnalysis {
  route: DemoRoute;
  totalDistanceNm: number;
  meanAlongWindKt: number;
  maximumCrossWindKt: number;
  samples: RouteWindSample[];
  is_simulated: true;
  operational_use: false;
}
```

- Distancia y puntos intermedios se calculan sobre gran círculo.
- Distancia usa radio terrestre `3440.065 NM`.
- Se generan 24 muestras incluyendo extremos.
- El bearing local define ejes longitudinal y transversal.
- `alongWindKt > 0` significa viento de cola; `< 0`, viento de frente.
- El signo de `crossWindKt` se conserva para indicar lado; el resumen muestra
  su magnitud máxima.
- Resultados visibles se redondean a una décima.
- Cambiar timestamp recalcula con el U/V activo; no consulta al backend.

## Precipitación

- Seis WebP RGBA `1024×1216` y las mismas esquinas de temperatura.
- Rango global `0–40 mm/h`.
- Opacidad fija `0.68`.
- El campo evoluciona suavemente, pero no se denomina radar ni observación.

```typescript
const PRECIPITATION_COLOR_STOPS = [
  [0, "#00000000"],
  [0.5, "#69d2e7"],
  [2, "#2b8cbe"],
  [8, "#41ab5d"],
  [15, "#f0e442"],
  [25, "#f28e2b"],
  [40, "#d73027"],
] as const;
```

## Isobaras

Cada GeoJSON es un `FeatureCollection<LineString>` con:

```typescript
interface IsobarProperties {
  pressure_hpa: number;
  timestamp: string;
  is_simulated: true;
  operational_use: false;
}
```

- niveles enteros entre `996` y `1024 hPa`, cada `4 hPa`;
- geometrías finitas y limitadas al bbox;
- líneas tenues, labels compactos y sin animación;
- el overlay puede mostrarse sobre cualquier capa principal;
- cambiar timestamp reemplaza el GeoJSON de forma atómica.

## Orden final de capas

```text
basemap
→ temperatura / precipitación / viento
→ límites departamentales
→ isobaras
→ ruta y muestras
→ aeropuertos
→ selección de aeropuerto y picker
→ labels
```

## Coherencia temporal y requests

Al cambiar timestamp:

1. conservar la escena completa anterior;
2. cargar frame principal, overlay, picker, aeropuerto y ruta necesarios;
3. descartar respuestas obsoletas mediante versión/AbortController;
4. aplicar el nuevo frame y datos derivados;
5. publicar `activeTimestamp` una sola vez;
6. iniciar la transición visual de entrada;
7. precargar anterior y siguiente sin cambiar estado visible.

No se crossfadean dos timestamps. La transición permitida es salida corta,
swap atómico a opacidad cero y entrada corta, desactivada con
`prefers-reduced-motion`.

## Reset final

`reset()` debe producir exactamente:

- capa `wind`;
- timestamp `06Z`;
- playback pausado;
- cámara inicial;
- sin aeropuerto;
- sin picker;
- sin ruta;
- isobaras ocultas;
- modo presentación desactivado;
- URL canónica sin parámetros no default;
- errores y requests pendientes limpiados.

## Política de errores

- Búsqueda vacía no altera selección.
- Serie aeroportuaria fallida no cierra el panel actual.
- Picker fallido muestra `Datos no disponibles` y conserva marcador.
- Punto externo muestra `Fuera de cobertura` y no fabrica valores.
- URL inválida usa defaults sin mostrar error bloqueante.
- Ruta inválida se rechaza antes de dibujar.
- Precipitación fallida conserva el último frame o permite cambiar de capa.
- Isobaras fallidas se ocultan y no bloquean meteorología.
- Unmount aborta fetches, timers y precargas; destruye adapters y listeners.
- Ningún error oculta el warning ni cambia los flags de simulación.

## Presupuesto de rendimiento

- Sin requests por frame de animación, drag del picker o movimiento de mapa.
- Cache máximo: timestamp activo, anterior y siguiente por producto.
- URL se actualiza solo tras estados estables.
- Ruta usa 24 muestras, no una muestra por píxel.
- Isobaras no se recalculan en el navegador.
- Si se pierde fluidez, reducir primero decoraciones o labels; no romper datos,
  warning, fallback o controles.
