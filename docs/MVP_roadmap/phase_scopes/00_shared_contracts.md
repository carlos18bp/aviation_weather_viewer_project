# Contratos compartidos congelados

Este documento es la frontera técnica entre todas las fases. Los ejemplos del
roadmap quedan concretados aquí para que backend, generación de datos y frontend
puedan desarrollarse en ramas distintas sin coordinar formatos durante la ola.

## Identidad y alcance

| Propiedad | Valor congelado |
|---|---|
| Repositorio real | `aviation_weather_viewer_project` |
| Servicio | `aero-meteo-mvp` |
| Escenario | `demo-colombia-001` |
| Fecha por defecto | `2026-01-15` |
| Cobertura WGS84 | `[-82, -5, -66, 14]` |
| Zona horaria | UTC/Zulu |
| Uso operacional | `false` |
| Fuente meteorológica | Simulada, semilla fija, sin APIs externas |

La fecha vive en una configuración única del generador. Cambiarla exige
regenerar los seis frames, el manifiesto y los registros de escenario; nunca se
infiere a partir del reloj del sistema.

## Timestamps

```text
2026-01-15T00:00:00Z
2026-01-15T03:00:00Z
2026-01-15T06:00:00Z
2026-01-15T09:00:00Z
2026-01-15T12:00:00Z
2026-01-15T15:00:00Z
```

- El frontend conserva timestamps ISO completos; `00Z`…`15Z` es solo copy.
- Siguiente desde `15Z` vuelve a `00Z`; anterior desde `00Z` vuelve a `15Z`.
- La reproducción usa un intervalo inicial de `1500 ms` por frame.
- El estado inicial confirmado es `06Z` y la capa inicial es temperatura.

## Cobertura y orden geográfico

El bbox siempre se expresa como `[west, south, east, north]`.

```json
[-82, -5, -66, 14]
```

Las esquinas del `ImageSource` de MapLibre se entregan en este orden:

```json
[
  [-82, 14],
  [-66, 14],
  [-66, -5],
  [-82, -5]
]
```

Todo dato geográfico usa EPSG:4326. El renderer puede convertir internamente a
Mercator, pero ninguna API expone coordenadas proyectadas.

## Assets versionados

```text
backend/media/demo-weather/demo-colombia-001/
├── manifest.json
├── airports.json
├── temperature/
│   ├── 00Z.webp
│   ├── 03Z.webp
│   ├── 06Z.webp
│   ├── 09Z.webp
│   ├── 12Z.webp
│   └── 15Z.webp
└── wind/
    ├── 00Z.json
    ├── 03Z.json
    ├── 06Z.json
    ├── 09Z.json
    ├── 12Z.json
    └── 15Z.json
```

Solo `backend/media/demo-weather/**` se exceptúa del ignore general de media.
Los uploads ordinarios continúan ignorados. Los artefactos se commitean para que
la presentación no dependa de ejecutar el generador ni de una red externa.

## Contrato de temperatura

- Formato: WebP RGBA transparente.
- Todas las imágenes comparten dimensiones, bbox y escala cromática.
- Rango visual global: `0–38 °C`; cada frame publica además su mínimo/máximo.
- El alpha suaviza los límites del campo, no codifica temperatura.
- Los píxeles no se interpretan de vuelta como datos científicos.

## Contrato de viento U/V

```typescript
export interface WindField {
  scenario: "demo-colombia-001";
  width: 128;
  height: 160;
  bbox: [-82, -5, -66, 14];
  unit: "kt";
  timestamp: string;
  is_simulated: true;
  operational_use: false;
  no_data_value: null;
  u: number[];
  v: number[];
}
```

- `u` y `v` son arrays planos de `width * height` valores.
- El orden es row-major: norte a sur y, dentro de cada fila, oeste a este.
- `u > 0` apunta al este; `v > 0` apunta al norte.
- Los valores están en nudos y no están normalizados.
- La interpolación del renderer es bilineal.
- `speed = sqrt(u² + v²)`; la dirección mostrada se deriva de los componentes.
- Cada frame debe validar longitudes, finitud y rango antes de publicarse.

## Manifiesto

`manifest.json` es la interfaz entre la fase generadora y Django. Incluye:

```typescript
interface DemoManifest {
  schema_version: 1;
  scenario: {
    code: "demo-colombia-001";
    name: string;
    description: string;
    scenario_date: "2026-01-15";
    bbox: [-82, -5, -66, 14];
    seed: number;
    is_simulated: true;
    operational_use: false;
  };
  frames: Array<{
    layer: "temperature" | "wind";
    timestamp: string;
    level: "surface";
    unit: "°C" | "kt";
    data_path: string;
    minimum: number;
    maximum: number;
    sha256: string;
  }>;
}
```

`data_path` es relativo a `MEDIA_ROOT`; nunca expone una ruta absoluta del
servidor. Debe haber exactamente doce entradas: dos capas por seis timestamps.

## Contratos HTTP

Los endpoints son públicos y no requieren JWT. No llevan slash final.

```text
GET /api/v1/health
GET /api/v1/demo/weather/catalog
GET /api/v1/demo/weather/frames?layer={layer}&timestamp={iso}
GET /api/v1/airports
GET /api/v1/airports?bbox={west},{south},{east},{north}
GET /api/v1/airports/{icaoCode}
GET /api/v1/demo/airports/{icaoCode}/weather?timestamp={iso}
```

### Salud

```json
{
  "status": "ok",
  "service": "aero-meteo-mvp",
  "environment": "development"
}
```

### Catálogo

```typescript
interface WeatherCatalogResponse {
  scenario: {
    code: string;
    name: string;
    scenario_date: string;
    is_simulated: true;
    operational_use: false;
  };
  layers: Array<{
    id: "temperature" | "wind";
    name: string;
    kind: "scalar" | "vector";
    unit: "°C" | "kt";
    minimum: number;
    maximum: number;
  }>;
  timestamps: string[];
}
```

### Frame

```typescript
interface WeatherFrameResponse {
  scenario: string;
  layer: "temperature" | "wind";
  timestamp: string;
  level: "surface";
  unit: "°C" | "kt";
  is_simulated: true;
  operational_use: false;
  coverage: { west: number; south: number; east: number; north: number };
  minimum: number;
  maximum: number;
  data_url: string;
  sha256: string;
}
```

### Aeropuertos

La colección se entrega como `FeatureCollection`. La geometría es `Point` y
`properties` contiene solo:

```text
icao_code, iata_code, name, city, department, elevation_ft
```

Los códigos ICAO se normalizan a mayúsculas. `bbox` inválido responde 400; ICAO
inexistente responde 404.

### Condición simulada de aeropuerto

```typescript
interface AirportWeatherResponse {
  airport: string;
  timestamp: string;
  is_simulated: true;
  operational_use: false;
  weather: {
    temperature_c: number;
    wind_speed_kt: number;
    wind_direction_deg: number;
    visibility_km: number;
    pressure_hpa: number;
  };
}
```

## Errores HTTP

Todo error de los endpoints demo usa:

```json
{
  "error": {
    "code": "invalid_timestamp",
    "message": "El timestamp solicitado no pertenece al escenario demo.",
    "details": {}
  },
  "is_simulated": true,
  "operational_use": false
}
```

| Caso | HTTP | Código estable |
|---|---:|---|
| layer inválida | 400 | `invalid_layer` |
| timestamp ausente/inválido | 400 | `invalid_timestamp` |
| bbox inválido | 400 | `invalid_bbox` |
| frame inexistente | 404 | `frame_not_found` |
| aeropuerto inexistente | 404 | `airport_not_found` |
| archivo registrado ausente | 503 | `asset_unavailable` |
| error inesperado | 500 | `internal_error` |

Los mensajes visibles están en español y no incluyen paths, trazas ni secretos.

## Estado frontend

```typescript
export type WeatherLayerId = "temperature" | "wind";

export interface WeatherViewerState {
  activeLayer: WeatherLayerId;
  activeTimestamp: string;
  committedTimestamp: string;
  availableTimestamps: string[];
  selectedAirport: string | null;
  selectedCoordinate: [number, number] | null;
  isPlaying: boolean;
  playbackSpeed: number;
  windVisible: boolean;
  opacity: number;
  mapViewport: { longitude: number; latitude: number; zoom: number };
  isMapReady: boolean;
  isFrameLoading: boolean;
  frameError: string | null;
}
```

Estado inicial:

```typescript
{
  activeLayer: "temperature",
  activeTimestamp: "2026-01-15T06:00:00Z",
  committedTimestamp: "2026-01-15T06:00:00Z",
  availableTimestamps: [],
  selectedAirport: null,
  selectedCoordinate: null,
  isPlaying: false,
  playbackSpeed: 1500,
  windVisible: false,
  opacity: 0.72,
  mapViewport: { longitude: -73.5, latitude: 4.5, zoom: 4.5 },
  isMapReady: false,
  isFrameLoading: false,
  frameError: null
}
```

`reset()` vuelve exactamente a esos valores, conservando únicamente el catálogo
ya cargado si sigue siendo válido.

## Controller y adapters

La API pública mínima es:

```typescript
export interface WeatherMapController {
  initialize(): Promise<void>;
  setLayer(layerId: string): void;
  setTimestamp(timestamp: string): void;
  setWindVisible(visible: boolean): void;
  focusAirport(icaoCode: string): void;
  selectCoordinate(longitude: number, latitude: number): void;
  setOpacity(value: number): void;
  resize(): void;
  reset(): void;
  destroy(): void;
}
```

Las capas se entregan a su constructor mediante adapters internos:

```typescript
export interface WeatherLayerAdapter<TFrame> {
  readonly id: WeatherLayerId | "airports";
  initialize(): Promise<void>;
  stageFrame?(frame: TFrame, signal: AbortSignal): Promise<void>;
  commitFrame?(timestamp: string): void;
  setVisible(visible: boolean): void;
  setOpacity?(value: number): void;
  reset(): void;
  destroy(): void;
}
```

Una fase de capa crea su adapter, pero solo la fase 08 lo registra en el
controller real.

## Sincronización atómica

Al cambiar timestamp:

1. incrementar `frameGeneration` y abortar la generación anterior;
2. mantener visibles los datos de `committedTimestamp`;
3. cargar en paralelo temperatura, viento y clima del aeropuerto seleccionado;
4. validar timestamp y checksum de cada respuesta;
5. ejecutar `stageFrame` sin hacer visible el resultado;
6. si todas las cargas terminan y la generación sigue activa, ejecutar los
   `commitFrame` y actualizar `committedTimestamp` en una sola transición;
7. si una carga falla, conservar completo el frame anterior y publicar error;
8. después del commit, precargar el timestamp siguiente sin modificar estado.

Nunca se mezcla temperatura de un timestamp con viento o panel de otro.

## Basemap local

La aplicación usa un style MapLibre local y GeoJSON simplificado de Natural
Earth bajo `frontend/public/map/`. No se permite un style, glyph, sprite o tile
URL remoto en el build de demostración.

Se conserva `frontend/public/map/NOTICE.md` con fuente, versión y licencia. Para
Admin-1 solo se mantienen geometría, nombre y códigos comunes; se eliminan
`type_en`, `valid_from` y `valid_to`.

## Renderer de viento

- Primario: WeatherLayers GL sobre deck.gl/MapLibre, encapsulado en
  `WindRenderer` y sin modificar código vendorizado.
- Contexto requerido: WebGL2.
- Calidad interna inicial: `medium`, 5.000 partículas; `low` usa 2.000 y `high`
  10.000. La UI de selección de calidad es P1.
- El adapter convierte U/V JSON a la textura que consume la librería; el JSON
  sigue siendo el contrato público.
- Si el spike no compila con Node 22, no mantiene alineación, no libera recursos
  o no alcanza 30 FPS en el equipo de referencia, se implementa un custom layer
  WebGL mínimo bajo la misma interfaz.
- Fallback runtime: flechas estáticas GeoJSON derivadas de una grilla reducida.

```typescript
export interface WindRenderer {
  initialize(): Promise<void>;
  setField(field: WindField): void;
  setVisible(visible: boolean): void;
  setQuality(quality: "high" | "medium" | "low"): void;
  resize(): void;
  render(): void;
  destroy(): void;
}
```

`destroy()` cancela animation frames, elimina listeners y borra programas,
buffers, texturas y framebuffers que pertenezcan al renderer.

## Referencias de licencia y compatibilidad

- [MapLibre GL JS CustomLayerInterface](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/)
- [WeatherLayers GL — repositorio y licencia MPL-2.0](https://github.com/weatherlayers/weatherlayers-gl)
- [WeatherLayers GL — compatibilidad](https://docs.weatherlayers.com/weatherlayers-gl)
- [Natural Earth — términos de uso](https://www.naturalearthdata.com/about/terms-of-use/)

Cada dependencia se instala con versión fijada en lockfile y se registra en el
inventario de fase 00/06. El equipo no modifica código MPL vendorizado dentro
del repositorio.

## Advertencia obligatoria

El copy exacto y permanente es:

> **DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL**

Debe permanecer visible con el mapa cargando, en error y usando fallback.
