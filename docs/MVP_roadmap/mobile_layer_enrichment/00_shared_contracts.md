# Contratos compartidos — Enriquecimiento móvil y capas aeronáuticas

Este documento congela la frontera técnica de las Fases 15–23. Extiende los
contratos de la Fase 14; no cambia identidad, cobertura, fecha, timestamps,
warning ni naturaleza simulada.

Una fase funcional no modifica este archivo. Si descubre un bloqueo, entrega
evidencia y una propuesta mínima en su handoff. El contrato se corrige entre
olas, nunca desde dos ramas paralelas.

## Identidad heredada

| Propiedad | Valor |
|---|---|
| Producto | Meteorología Aeronáutica · Demo ProjectApp |
| Escenario | demo-colombia-001 |
| Fecha | 2026-01-15 |
| Cobertura WGS84 | [-82, -5, -66, 14] |
| Timestamps | 00Z, 03Z, 06Z, 09Z, 12Z, 15Z |
| Vista inicial | [-73.5, 4.5], zoom 4.7 |
| Estado inicial | viento, 06Z, sin selección ni overlay |
| Fuente | simulada, determinística, local y versionada |
| Uso operacional | false |

Warning inmutable:

~~~text
DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL
~~~

No se deriva fecha o timestamp del reloj del dispositivo.

## Requerimientos funcionales

| ID | Requerimiento |
|---|---|
| MRF-001 | Reorganizar el visor para teléfono, tableta y desktop sin ocultar funciones de Fase 14. |
| MRF-002 | Respetar safe areas, orientación, viewport dinámico y warning permanente. |
| MRF-003 | Ofrecer paneles, acciones y timeline táctiles con mapa dominante. |
| MRF-004 | Distinguir tap, pan, pinch, aeropuerto y selección de coordenada. |
| MRF-005 | Adaptar partículas y precarga automáticamente al dispositivo y FPS observado. |
| MRF-006 | Añadir nubosidad total simulada durante seis timestamps. |
| MRF-007 | Añadir base de nubes simulada durante seis timestamps. |
| MRF-008 | Añadir visibilidad simulada durante seis timestamps. |
| MRF-009 | Añadir ráfagas simuladas durante seis timestamps. |
| MRF-010 | Mostrar valor actual y evolución temporal de una coordenada. |
| MRF-011 | Navegar siete capas y overlays mediante un explorador categorizado. |
| MRF-012 | Integrar responsive, touch, capas y punto con timestamp atómico. |
| MRF-013 | Extender URL, reset, errores y release a los nuevos IDs sin regresión desktop. |

## Requerimientos no funcionales

| ID | Requerimiento |
|---|---|
| MRNF-001 | Todo dato nuevo incluye is_simulated=true y operational_use=false. |
| MRNF-002 | Assets y respuestas son determinísticos y reproducibles entre ambientes. |
| MRNF-003 | No se consultan servicios meteorológicos o cartográficos externos. |
| MRNF-004 | Ninguna transición publica simultáneamente timestamps diferentes. |
| MRNF-005 | Objetivo cercano o superior a 30 FPS con degradación automática segura. |
| MRNF-006 | Touch targets son de 44×44 CSS px y ninguna acción exige drag. |
| MRNF-007 | Fallar una mejora conserva utilizable el recorrido original. |
| MRNF-008 | Unmount/destroy cancela requests, timers, observers, listeners y RAF. |
| MRNF-009 | Se valida iOS/Android en teléfono y tableta, portrait y landscape. |
| MRNF-010 | El recorrido desktop a 1920×1080 conserva jerarquía y funcionalidad. |

## Contrato responsive

### Modos

| Modo | Ancho CSS | Composición |
|---|---:|---|
| phone | 360–767 px | bottom sheet en portrait; drawer derecho si altura ≤500 px |
| tablet | 768–1199 px | panel/drawer de 320 px y timeline inferior |
| desktop | ≥1200 px | composición flotante de Fase 14 |

Anchos inferiores a 360 px solo deben evitar overflow catastrófico. No son
viewport objetivo. La clasificación se basa en matchMedia, no en user agent.

~~~typescript
type ViewerViewportMode = "phone" | "tablet" | "desktop";
type ViewerOrientation = "portrait" | "landscape";
type SheetSnapPoint = "closed" | "peek" | "half" | "full";
type ResponsivePanelId =
  | "layers"
  | "location"
  | "airport"
  | "route"
  | "more";

interface ResponsivePanelState {
  activePanel: ResponsivePanelId | null;
  snapPoint: SheetSnapPoint;
}
~~~

El estado de panel es efímero y local al host responsive. No entra en Zustand,
URL ni backend.

### Safe areas y viewport

- Next publica viewport-fit=cover.
- El root usa 100dvh con fallback 100vh.
- Header, warning, panel host y timeline suman
  env(safe-area-inset-top/right/bottom/left).
- El teclado no activa autofocus al abrir búsqueda y el contenido del sheet
  conserva scroll interno.
- Resize/orientation solo llama resize del controller existente; nunca remonta
  mapa, adapters o WebGL.

### Interacción y accesibilidad

- Todo botón/control tiene hitbox mínima 44×44 CSS px.
- Hover solo enriquece; ninguna función depende de hover.
- Focus visible, nombre accesible y orden lógico se conservan.
- El sheet ofrece botones explícitos para expandir, contraer y cerrar.
- prefers-reduced-motion elimina transiciones decorativas; viento sigue siendo
  información visual y mantiene play/pausa/ocultar.
- El mapa espacial es la excepción natural al target rectangular.

### Composición

- Phone portrait: header compacto, action rail, warning exacto, timeline
  compacto y un bottom sheet no modal.
- Phone landscape: header mínimo, timeline de una fila y drawer derecho con
  máximo 42vw.
- Tablet portrait: mapa completo, action rail y panel de 320 px superpuesto.
- Tablet landscape: panel lateral de 320 px, mapa dominante y timeline completo.
- Desktop conserva la composición integrada por Fase 14.

## Contrato táctil GIS

MapLibre mantiene pan de un dedo, pinch zoom y doble tap/drag. Rotación, pitch,
keyboard interno y cooperativeGestures permanecen desactivados.

Un gesto es tap elegible cuando:

- usa un solo punto;
- dura como máximo 500 ms;
- el desplazamiento acumulado no excede 8 CSS px;
- no comenzó mientras había pinch o drag activo.

Prioridad de resolución:

1. si existe modo de captura de ruta y se toca un aeropuerto, asignarlo al
   extremo pendiente;
2. en otro caso, un aeropuerto visible abre/actualiza aeropuerto;
3. un fondo válido dentro de cobertura abre o mueve el picker;
4. fuera de cobertura no cambia selección y muestra feedback no bloqueante.

Pan, pinch y doble tap nunca abren el picker. Mover el punto puede hacerse con
otro tap; drag del marcador es opcional y no exclusivo.

~~~typescript
type TouchMapIntent =
  | { kind: "airport"; icaoCode: string }
  | { kind: "coordinate"; coordinate: readonly [number, number] }
  | { kind: "route-airport"; icaoCode: string }
  | { kind: "none" };

interface TouchMapCoordinator {
  attach(): void;
  setRouteCapture(active: boolean): void;
  destroy(): void;
}
~~~

El coordinator recibe callbacks y una fachada mínima del mapa. No importa
store, orquestador ni componentes.

## Catálogo final de capas

Orden canónico:

~~~typescript
type WeatherLayerId =
  | "temperature"
  | "wind"
  | "precipitation"
  | "cloud-cover"
  | "cloud-base"
  | "visibility"
  | "wind-gusts";

type WeatherLayerCategory = "essential" | "aviation";
~~~

| ID | Categoría | Kind | Unidad | Rango | Valor por punto |
|---|---|---|---|---:|---|
| temperature | essential | scalar | °C | 0–38 | Sí |
| wind | essential | vector | kt | 0–60 | Sí |
| precipitation | essential | scalar | mm/h | 0–40 | No |
| cloud-cover | aviation | scalar | % | 0–100 | Sí |
| cloud-base | aviation | scalar | ft AGL | 300–15000/null | Sí |
| visibility | aviation | scalar | km | 1–20 | Sí |
| wind-gusts | aviation | scalar | kt | 0–80 | Sí |

Solo una capa principal está activa. pressure-isobars continúa como overlay
independiente. No se añade mezcla arbitraria, opacidad configurable ni
favoritos persistentes.

## Manifiesto schema 3

La Fase 18 crea assets y descriptores staged, pero no reemplaza el manifiesto
vivo. La Fase 23 eleva schema 2 a 3 de forma atómica.

~~~typescript
interface DemoManifestV3 {
  schema_version: 3;
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
    id: WeatherLayerId;
    name: string;
    category: WeatherLayerCategory;
    kind: "scalar" | "vector";
    unit: "°C" | "kt" | "mm/h" | "%" | "ft AGL" | "km";
    minimum: number;
    maximum: number;
    supports_point_value: boolean;
  }>;
  timestamps: string[];
  frames: Array<{
    layer: WeatherLayerId;
    timestamp: string;
    data_path: string;
    value_data_path?: string;
    minimum: number;
    maximum: number;
  }>;
  overlays: OverlayCatalogDefinition[];
}
~~~

Reglas:

- existen exactamente 42 frames principales: 7 capas × 6 timestamps;
- temperature y las cuatro capas nuevas exigen value_data_path;
- wind y precipitation prohíben value_data_path;
- pressure-isobars conserva sus seis frames y contrato;
- el orden de capas y timestamps es canónico;
- paths son relativos, same-origin y sin traversal;
- schema 2 sigue siendo inválido después del commit atómico de Fase 23.

## Assets nuevos

~~~text
backend/media/demo-weather/demo-colombia-001/
├── cloud-cover/            00Z.webp ... 15Z.webp
├── cloud-cover-values/     00Z.json ... 15Z.json
├── cloud-base/             00Z.webp ... 15Z.webp
├── cloud-base-values/      00Z.json ... 15Z.json
├── visibility/             00Z.webp ... 15Z.webp
├── visibility-values/      00Z.json ... 15Z.json
├── wind-gusts/             00Z.webp ... 15Z.webp
└── wind-gusts-values/      00Z.json ... 15Z.json
~~~

Son 48 archivos nuevos. Los WebP son RGBA 1024×1216; los grids son 128×160,
row-major norte-sur/oeste-este y comparten bbox.

~~~typescript
interface AviationScalarGrid {
  scenario: "demo-colombia-001";
  layer: "cloud-cover" | "cloud-base" | "visibility" | "wind-gusts";
  width: 128;
  height: 160;
  bbox: [-82, -5, -66, 14];
  unit: "%" | "ft AGL" | "km" | "kt";
  timestamp: string;
  is_simulated: true;
  operational_use: false;
  no_data_value: null;
  values: Array<number | null>;
}
~~~

Solo cloud-base admite null dentro de values. Todos los demás valores son
finitos y permanecen en su rango.

## Coherencia determinística

Fase 18 reutiliza el driver espacial/temporal suave y la semilla existentes.
Para cada celda normaliza:

- m: índice de humedad suave 0–1;
- p: intensidad de precipitación de Fase 13 normalizada 0–1;
- s: velocidad del campo U/V 0–60 kt;
- v: factor de valle/topografía aproximada 0–1.

Derivaciones normativas antes de redondear:

~~~text
cloud_cover = clamp(100 × (0.55m + 0.45p), 0, 100)
cloud_base  = null si cloud_cover < 20
cloud_base  = clamp(12000 - 95×cloud_cover - 4500p + 900(1-v), 300, 15000)
visibility  = clamp(20 - 12p - 7(cloud_cover/100) - 2v, 1, 20)
gust        = clamp(max(s, s×(1.15 + 0.35m) + 4p), 0, 80)
~~~

La visibilidad muestreada en cada aeropuerto difiere como máximo 2 km de su
fixture. Gust siempre es mayor o igual a la velocidad U/V muestreada.

## Paletas y render

| Capa | Stops principales | Opacidad |
|---|---|---:|
| cloud-cover | 0 transparente; 25/50/75/100 blanco-azulado creciente | 0.58 |
| cloud-base | 300 rojo; 1000 naranja; 3000 amarillo; 6000 cian; 10000 azul; 15000 violeta | 0.64 |
| visibility | 1 magenta; 3 rojo; 5 naranja; 10 amarillo; 15 cian; 20 azul oscuro | 0.62 |
| wind-gusts | 0 transparente; 15 cian; 30 verde; 45 naranja; 60 magenta; 80 violeta | 0.66 |

Fade de ImageSource es cero. El cambio temporal se coordina con el runner
atómico de Fase 14. Las opacidades son fijas.

IDs reservados:

~~~text
weather-cloud-cover-source
weather-cloud-cover-layer
weather-cloud-base-source
weather-cloud-base-layer
weather-visibility-source
weather-visibility-layer
weather-wind-gusts-source
weather-wind-gusts-layer
~~~

## API final

No se crean endpoints. Se extienden:

~~~http
GET /api/v1/demo/weather/catalog
GET /api/v1/demo/weather/frames?layer={layer}&timestamp={iso}
~~~

El catálogo publica siete capas, category y supports_point_value. Frames de las
cuatro capas nuevas devuelven data_url y value_data_url. Errores conservan:

- layer/timestamp inválido: 400;
- asset ausente/corrupto: 503 asset_unavailable;
- ninguna respuesta expone filesystem;
- todos los payloads conservan flags de simulación.

El picker y point forecast interpolan en navegador; no existe request por tap.

## Muestra por punto

~~~typescript
interface AviationPointSample {
  coordinate: readonly [number, number];
  timestamp: string;
  temperatureC: number;
  windSpeedKt: number;
  windDirectionDeg: number;
  cloudCoverPct: number;
  cloudBaseFtAgl: number | null;
  visibilityKm: number;
  windGustKt: number;
  isSimulated: true;
  operationalUse: false;
}
~~~

- temperatura/viento reutilizan Fase 10;
- los cuatro grids nuevos usan interpolación bilineal;
- si uno de los cuatro vecinos de cloud-base es null, el resultado es null;
- temperatura, velocidades, cobertura y visibilidad se redondean a un decimal;
- base de nubes se redondea a 100 ft y dirección a entero;
- se cachean únicamente timestamp activo y vecinos permitidos por perfil;
- respuestas obsoletas nunca reemplazan el punto activo.

## Explorador de capas

Accesos rápidos fijos:

~~~text
wind · temperature · precipitation · cloud-cover
~~~

Lista completa:

- Esenciales: wind, temperature, precipitation.
- Aviación: cloud-cover, cloud-base, visibility, wind-gusts.
- Overlays: pressure-isobars.

El explorador es controlado mediante props/callbacks. No conoce Zustand ni
MapLibre. La leyenda compacta refleja capa activa; al expandirse muestra rango,
unidad y texto inequívoco de simulación.

## Rendimiento adaptativo

~~~typescript
type WindRenderProfileId = "phone" | "tablet" | "desktop" | "degraded";

interface WindRenderProfile {
  id: WindRenderProfileId;
  particleCount: number;
  preloadRadius: 0 | 1;
}
~~~

| Perfil | Partículas | Cache temporal |
|---|---:|---|
| phone | 900 | activo + siguiente |
| tablet | 1600 | activo ±1 |
| desktop | 2500 | activo ±1 |
| degraded | 60 % del perfil, mínimo 450 | activo |

La ventana móvil de FPS usa tres segundos. Un promedio sostenido menor a 24
aplica una sola degradación por sesión; no existe upgrade automático que pueda
oscilar. document.hidden pausa RAF/playback y el retorno reanuda el frame
vigente. El perfil no entra en store, URL o API.

## Estado y escena final

Zustand conserva estado meteorológico serializable y agrega los IDs de capa,
selectedCoordinate y los valores ya previstos por Fase 14. No almacena:

- mapa, adapters o WebGL;
- panel/snap responsive;
- orientación o media queries;
- perfil/FPS;
- grids o imágenes.

El scene codec acepta los siete IDs. Panel, snap, perfil y orientación no se
serializan. Una capa desconocida vuelve al default wind. Reset produce wind,
06Z, cámara inicial, isobaras ocultas y sin aeropuerto, picker o ruta.

## Política de error y limpieza

- Fallo responsive conserva el mapa y controles básicos.
- Fallo de perfil conserva 900/1600/2500 según viewport.
- Fallo de una capa conserva último frame válido y permite volver a wind.
- Fallo de value grid conserva raster pero point forecast marca ese valor como
  no disponible.
- Fallo de point forecast conserva coordenada y ofrece retry.
- Fallo de layer explorer conserva los cuatro accesos rápidos.
- Fallo de URL usa defaults y canonicaliza.
- Unmount aborta fetch, revoca object URLs, cancela timers/RAF, desconecta
  observers y elimina listeners/layers/sources en orden inverso.

## Matriz de validación

Automatizada:

| Proyecto | Viewport/orientación |
|---|---|
| Mobile Chrome | 360×800 portrait y 800×360 landscape |
| Mobile Safari/WebKit | 390×844 portrait y 844×390 landscape |
| Tablet Chrome | 800×1280 y 1280×800 |
| Tablet Safari/WebKit | 768×1024 y 1024×768 |
| Desktop Chrome | 1920×1080 |

Playwright emula browser/dispositivo; no se presenta como Safari físico.
El cierre añade smoke manual en un iPhone Safari y un Android Chrome reales.

El warning, UTC, timeline, layer control, panel activo y salida de estado
deben permanecer alcanzables en todos los casos.
