# Contratos compartidos congelados — Demo visual Colombia

Este archivo es la frontera entre las sesiones paralelas. Congela solo lo que
la demostración utiliza; una fase no debe volver a introducir capacidades
descartadas del starter o del antiguo P1.

## Identidad y objetivo

| Propiedad | Valor |
|---|---|
| Producto visible | Meteorología Aeronáutica · Demo ProjectApp |
| Servicio backend | `aero-meteo-mvp` |
| Escenario | `demo-colombia-001` |
| Fecha ficticia | `2026-01-15` |
| Cobertura WGS84 | `[-82, -5, -66, 14]` |
| Zona horaria | UTC/Zulu |
| Viewport de aceptación | `1920×1080`, Chrome o Edge |
| Tema | Único, oscuro aeronáutico |
| Uso operacional | `false` |
| Fuente | Simulada, determinística y local |

La fecha no se deriva del reloj. Cambiarla exige regenerar todos los assets y
actualizar el manifiesto.

## Dirección visual fija

- Mapa fullscreen; Colombia ocupa el centro y la mayor superficie disponible.
- Basemap carbón/azul, discreto y sin selector de tema.
- Paneles compactos, translúcidos y con borde tenue.
- Partículas claras y finas, visibles sin ocultar límites ni aeropuertos.
- Campo térmico continuo con suficiente transparencia para conservar contexto.
- Tipografía del sistema; no se descargan fuentes durante la reunión.

Tokens base:

```css
--viewer-bg: #07131f;
--viewer-surface: rgb(7 19 31 / 78%);
--viewer-border: rgb(255 255 255 / 14%);
--viewer-text: #f5f7fa;
--viewer-muted: #a8b4c2;
--viewer-accent: #22d3ee;
--viewer-warning: #f59e0b;
```

Composición `1920×1080`:

```text
┌ marca / título ─────────────── hora UTC · reset ┐
│ panel aeropuerto                               │
│                                                │
│                MAPA DE COLOMBIA     capas      │
│                + meteorología       leyenda    │
│                                                │
│ warning                                        │
└──────────── controles + timeline ──────────────┘
```

Otros tamaños solo deben evitar overflow grave. No existe fase mobile,
responsive avanzada ni dark/light mode.

## Cámara y cobertura

```typescript
export const INITIAL_VIEW = {
  longitude: -73.5,
  latitude: 4.5,
  zoom: 4.7,
  bearing: 0,
  pitch: 0,
};
```

- `minZoom: 4`, `maxZoom: 9`.
- `maxBounds: [[-84, -7], [-64, 16]]` para impedir navegación global.
- El bbox meteorológico siempre usa `[west, south, east, north]`.
- Todo dato público usa EPSG:4326.
- La cobertura del campo meteorológico es exactamente `[-82, -5, -66, 14]`.

## Timestamps y defaults

```text
2026-01-15T00:00:00Z
2026-01-15T03:00:00Z
2026-01-15T06:00:00Z
2026-01-15T09:00:00Z
2026-01-15T12:00:00Z
2026-01-15T15:00:00Z
```

- El estado inicial es `06Z` con capa `wind` para producir impacto inmediato.
- El copy corto usa `00Z`…`15Z`; el estado conserva ISO completo.
- Siguiente desde `15Z` vuelve a `00Z`; anterior desde `00Z` vuelve a `15Z`.
- Playback usa un intervalo fijo de `1500 ms` y no ofrece selector de velocidad.
- Un tick se omite si hay un frame cargando; no se acumulan timers.

## Assets locales

```text
backend/media/demo-weather/demo-colombia-001/
├── manifest.json
├── airport-weather.json
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

Los assets se versionan para que el despliegue no dependa de ejecutar el
generador. Solo este subárbol se exceptúa del ignore general de media.

## Política de autoría y runtime

Los archivos versionados son la fuente de verdad del producto demostrativo. El
dataset permanece fijo entre ambientes y recargas; la experiencia sí es
dinámica porque cada timestamp selecciona artefactos distintos y WebGL anima el
campo U/V activo.

- Ruta primaria de autoría: ejecutar una vez un generador Python determinístico
  para producir temperatura y viento, validar su salida y commitearla.
- Clima aeroportuario: curar y hardcodear treinta y seis registros en
  `airport-weather.json`, uno por cada combinación aeropuerto/timestamp.
- Contingencia de plazo: se aceptan WebP/JSON preparados manualmente si cumplen
  exactamente este contrato y pasan los mismos validadores.
- Runtime: Django abre el manifiesto y los fixtures, valida inputs y sirve
  metadata/URLs; nunca calcula ni regenera meteorología.
- Prohibido en runtime: `random`, Faker, fecha actual, jobs de generación o
  valores meteorológicos construidos dentro de una view/request.
- Prohibido en UI: matrices U/V, tablas de clima o arrays masivos hardcoded en
  componentes React.

El comando de autoría, si existe, no se invoca desde startup, build, deploy,
migraciones ni requests. CI puede ejecutarlo explícitamente en un directorio
temporal para comprobar determinismo; la demo desplegada solo lee artefactos ya
versionados.

## Contrato de temperatura

- Formato WebP RGBA `1024×1216`, mismas dimensiones para los seis frames.
- Mismas esquinas MapLibre para todos los frames:

```json
[
  [-82, 14],
  [-66, 14],
  [-66, -5],
  [-82, -5]
]
```

- Rango visual global `0–38 °C` y paleta única en todos los timestamps.
- El alpha suaviza el campo; no representa un valor científico.
- Opacidad visual fija `0.72`; no existe control de usuario.

Stops térmicos:

```typescript
export const TEMPERATURE_COLOR_STOPS = [
  [0, "#313695"],
  [8, "#4575b4"],
  [14, "#74add1"],
  [20, "#abd9e9"],
  [24, "#fee090"],
  [28, "#fdae61"],
  [33, "#f46d43"],
  [38, "#a50026"],
] as const;
```

## Contrato de viento

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

- `u` y `v` contienen `128 * 160` valores row-major, norte a sur y oeste a este.
- `u > 0` apunta al este; `v > 0` apunta al norte.
- Los valores son nudos; `speed = sqrt(u² + v²)`.
- El renderer interpola bilinealmente.
- Calidad fija inicial: `5000` partículas. El tuning puede reducirla, pero no
  expone perfiles en la interfaz.

Stops visuales por velocidad:

```typescript
export const WIND_SPEED_COLOR_STOPS = [
  [0, "#8ecae6"],
  [15, "#22d3ee"],
  [30, "#84cc16"],
  [45, "#f59e0b"],
  [60, "#ef4444"],
] as const;
```

## Descriptor de leyenda

```typescript
export interface WeatherLegendDefinition {
  title: "Temperatura" | "Viento";
  unit: "°C" | "kt";
  minimum: number;
  maximum: number;
  colorStops: ReadonlyArray<readonly [number, string]>;
}
```

Las fases 03 y 05 exportan su descriptor usando exactamente los stops de este
documento. La fase 06 transforma `colorStops` en el gradiente visual.

## Manifiesto

El manifiesto reemplaza modelos de escenario/frame y es la fuente de catálogo:

```typescript
interface DemoManifest {
  schema_version: 1;
  scenario: {
    code: "demo-colombia-001";
    name: string;
    scenario_date: "2026-01-15";
    bbox: [-82, -5, -66, 14];
    seed: number;
    is_simulated: true;
    operational_use: false;
  };
  airport_weather_path: "airport-weather.json";
  layers: Array<{
    id: "temperature" | "wind";
    name: string;
    kind: "scalar" | "vector";
    unit: "°C" | "kt";
    minimum: number;
    maximum: number;
  }>;
  timestamps: string[];
  frames: Array<{
    layer: "temperature" | "wind";
    timestamp: string;
    data_path: string;
    minimum: number;
    maximum: number;
  }>;
}
```

Debe contener doce frames. `data_path` es relativo a `MEDIA_ROOT`; nunca incluye
un path absoluto. Los hashes pueden utilizarse en tests de determinismo, pero
no forman parte de la API ni se verifican durante cada carga del navegador.

## Aeropuertos congelados

La demo carga exactamente estos seis aeropuertos. Las coordenadas GeoJSON usan
orden longitud/latitud:

| ICAO | IATA | Nombre | Ciudad / departamento | Longitud | Latitud | Elevación ft |
|---|---|---|---|---:|---:|---:|
| [SKBO](https://ourairports.com/airports/SKBO/) | BOG | El Dorado International Airport | Bogotá / Bogotá D.C. | -74.146900 | 4.701590 | 8361 |
| [SKRG](https://ourairports.com/airports/SKRG/) | MDE | José María Córdova International Airport | Medellín / Antioquia | -75.423100 | 6.164540 | 6955 |
| [SKCL](https://ourairports.com/airports/SKCL/) | CLO | Alfonso Bonilla Aragón International Airport | Cali / Valle del Cauca | -76.381898 | 3.542717 | 3162 |
| [SKBQ](https://ourairports.com/airports/SKBQ/) | BAQ | Ernesto Cortissoz International Airport | Barranquilla / Atlántico | -74.780800 | 10.889600 | 98 |
| [SKCG](https://ourairports.com/airports/SKCG/) | CTG | Rafael Núñez International Airport | Cartagena / Bolívar | -75.513000 | 10.442400 | 4 |
| [SKSM](https://ourairports.com/airports/SKSM/) | SMR | Simón Bolívar International Airport | Santa Marta / Magdalena | -74.230600 | 11.119600 | 22 |

Fuente: [OurAirports Open Data](https://ourairports.com/data/), datos publicados
como dominio público y usados solo como referencia ilustrativa. Toda condición
meteorológica es ficticia. PostGIS almacena únicamente el modelo `Airport` con
`PointField(srid=4326)`; no se crean modelos para matrices, escenarios, frames o
coberturas.

## Fixture de clima aeroportuario

`airport-weather.json` usa un array deliberadamente pequeño y legible:

```typescript
type DemoAirportIcao = "SKBO" | "SKRG" | "SKCL" | "SKBQ" | "SKCG" | "SKSM";

interface AirportWeatherFixture {
  schema_version: 1;
  scenario: "demo-colombia-001";
  is_simulated: true;
  operational_use: false;
  records: Array<{
    airport: DemoAirportIcao;
    timestamp: string;
    temperature_c: number;
    wind_speed_kt: number;
    wind_direction_deg: number;
    visibility_km: number;
    pressure_hpa: number;
  }>;
}
```

Reglas del fixture:

- contiene exactamente treinta y seis registros y ninguna combinación
  `(airport, timestamp)` duplicada;
- cubre el producto cartesiano de los seis ICAO y los seis timestamps;
- todos los números son finitos: temperatura `4–36 °C`, viento `0–40 kt`,
  dirección entera `0–359°`, visibilidad `1–20 km` y presión `980–1040 hPa`;
- los valores cambian de forma moderada entre timestamps y son visualmente
  coherentes con los campos de temperatura y viento, sin pretensión científica;
- el orden canónico es timestamp ascendente y, dentro de cada timestamp, el
  orden de aeropuertos de la tabla anterior.

Estos valores se curan una sola vez y se versionan. La API selecciona el registro
solicitado; no aplica ruido ni deriva un valor nuevo durante la request.

## Contratos HTTP mínimos

Los endpoints son públicos, same-origin, sin JWT y sin slash final:

```text
GET /api/v1/health
GET /api/v1/demo/weather/catalog
GET /api/v1/demo/weather/frames?layer={layer}&timestamp={iso}
GET /api/v1/airports
GET /api/v1/demo/airports/{icaoCode}/weather?timestamp={iso}
```

No se implementan detalle de aeropuerto, filtro bbox, nearest-airport, search o
sample por coordenada.

### Health

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
  unit: "°C" | "kt";
  is_simulated: true;
  operational_use: false;
  coverage: { west: number; south: number; east: number; north: number };
  minimum: number;
  maximum: number;
  data_url: string;
}
```

### Aeropuertos

`GET /airports` entrega un GeoJSON `FeatureCollection`. Cada `Point` contiene:

```text
icao_code, iata_code, name, city, department, elevation_ft
```

### Condición de aeropuerto

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

Errores esperados: `400 invalid_layer`, `400 invalid_timestamp`,
`404 airport_not_found`, `404 frame_not_found` y `503 asset_unavailable`. Todos
usan copy en español, conservan los dos flags y nunca exponen paths ni trazas.

## Estado frontend mínimo

```typescript
export type WeatherLayerId = "temperature" | "wind";

export interface WeatherViewerState {
  activeLayer: WeatherLayerId;
  activeTimestamp: string;
  availableTimestamps: string[];
  selectedAirport: string | null;
  isPlaying: boolean;
  isMapReady: boolean;
  isFrameLoading: boolean;
  frameError: string | null;
}
```

Defaults:

```typescript
{
  activeLayer: "wind",
  activeTimestamp: "2026-01-15T06:00:00Z",
  availableTimestamps: [],
  selectedAirport: null,
  isPlaying: false,
  isMapReady: false,
  isFrameLoading: false,
  frameError: null
}
```

No existen `selectedCoordinate`, `opacity`, `quality`, `playbackSpeed`,
`windVisible`, URL state ni viewport global. La cámara pertenece al controller.

## Controller y adapters

```typescript
export type WeatherMapFrame =
  | {
      layer: "temperature";
      timestamp: string;
      imageUrl: string;
    }
  | {
      layer: "wind";
      timestamp: string;
      field: WindField;
    };

export interface WeatherMapController {
  initialize(): Promise<void>;
  setLayer(layerId: WeatherLayerId): void;
  setWeatherFrame(frame: WeatherMapFrame): Promise<void>;
  setAirports(collection: GeoJSON.FeatureCollection): void;
  setSelectedAirport(icaoCode: string | null): void;
  focusAirport(icaoCode: string): void;
  resize(): void;
  reset(): void;
  destroy(): void;
}

export interface WeatherLayerAdapter<TFrame> {
  readonly id: WeatherLayerId | "airports";
  initialize(): Promise<void>;
  setFrame?(frame: TFrame): Promise<void> | void;
  setSelectedFeature?(featureId: string | null): void;
  focusFeature?(featureId: string): void;
  setVisible(visible: boolean): void;
  reset(): void;
  destroy(): void;
}
```

La instancia MapLibre y sus listeners se crean una sola vez. React nunca
almacena la instancia ni dibuja partículas. El `ViewerOrchestrator` carga y
valida API/assets; la UI solo invoca al controller/orchestrator, nunca a adapters
internos.

## Cambio de timestamp

1. La UI solicita el timestamp sin cambiar todavía `activeTimestamp`.
2. Se marca `isFrameLoading` y se conserva visible el frame anterior.
3. Se carga el frame de la capa activa y, si hay aeropuerto, su condición.
4. Si ambos terminan, el orquestador espera `setWeatherFrame`, actualiza el
   panel y publica el nuevo `activeTimestamp` en una transición.
5. Si falla, el frame anterior permanece y se muestra retry/reset.
6. Al cambiar de capa se carga la nueva capa para el timestamp ya activo.

Por tanto, “datos fijos” no significa “pantalla estática”: avanzar el timeline
cambia la URL/field activo, la textura o las partículas, los valores del panel,
la leyenda y el copy UTC. Recargar la aplicación debe reconstruir exactamente el
mismo escenario y la misma secuencia.

Como solo una capa meteorológica está visible, no se implementa doble buffer de
temperatura y viento ni una cache LRU. Requests obsoletos se abortan.

## Basemap local

El style MapLibre y los GeoJSON simplificados viven en `frontend/public/map/`.
Incluyen costa, límites nacionales, departamentos de Colombia y contexto vecino
mínimo. Los symbol layers usan Noto Sans mediante glyph PBF locales en
`frontend/public/map/fonts/{fontstack}/{range}.pbf`; el style referencia una URL
same-origin. No hay URLs remotas de tiles, styles, glyphs, sprites o fuentes.
`NOTICE.md` registra fuente, versión y licencia de cada asset.

## Renderer de viento

```typescript
export interface WindRenderer {
  initialize(): Promise<void>;
  setField(field: WindField): void;
  setVisible(visible: boolean): void;
  resize(): void;
  destroy(): void;
}
```

- Opción primaria: WeatherLayers GL encapsulada sobre MapLibre/WebGL2.
- Si no supera compatibilidad, alineación, lifecycle o 30 FPS en el equipo
  objetivo, se usa un custom layer WebGL2 mínimo bajo la misma interfaz.
- Fallback runtime: flechas GeoJSON estáticas derivadas de una grilla reducida.
- `destroy()` cancela RAF, elimina listeners y libera recursos WebGL propios.
- No se modifica código vendorizado ni se expone control de quality.

## Inventario mínimo de licencias

| Recurso | Licencia elegida | Fuente |
|---|---|---|
| MapLibre GL JS | BSD-3-Clause | [LICENSE](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt) |
| WeatherLayers GL, si supera el spike | MPL-2.0 | [Repositorio/licencia](https://github.com/weatherlayers/weatherlayers-gl) |
| Natural Earth | Dominio público | [Terms of Use](https://www.naturalearthdata.com/about/terms-of-use/) |
| Noto Sans | OFL-1.1 | [Repositorio](https://github.com/notofonts/noto-fonts) |
| OurAirports | Dominio público | [Open Data](https://ourairports.com/data/) |

Cada fase fija una versión en lockfile/asset y conserva avisos aplicables en
`NOTICE.md`. WeatherLayers se consume como dependencia sin modificar ni copiar
su código fuente; cualquier modificación futura a archivos MPL se revisa fuera
del alcance de esta demo.

## Advertencia obligatoria

El copy exacto y permanente es:

> **DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL**

Debe permanecer visible durante loading, error y fallback.
