# Fase 13 — Precipitación e isobaras simuladas

## Objetivo

Enriquecer la lectura meteorológica del mapa con una tercera capa visual de
precipitación y un overlay clásico de presión. Ambos productos son ficticios,
determinísticos y se sirven como assets locales; nunca se denominan radar,
observación o información oficial.

## Ola y dependencias

- **Ola:** E2, paralela con fase 12.
- **Requiere:** ola E1 integrada y manifiesto schema 2 de fase 10.
- **Desbloquea:** integración final de fase 14.
- **Requerimientos:** ERF-010, ERF-011, ENF-001, ENF-002 y ENF-005.
- **No depende:** búsqueda, ruta o panel aeroportuario.

## Resultado demostrable aislado

Con mapa/harness y catálogo:

1. seleccionar precipitación y cargar `06Z`;
2. mostrar WebP, leyenda `0–40 mm/h` y copy simulado;
3. activar isobaras `06Z` sobre precipitación;
4. cambiar a `09Z` y reemplazar ambos assets;
5. ocultar isobaras sin cambiar capa;
6. forzar fallo del GeoJSON y conservar precipitación utilizable.

La fase 14 conectará selector, store, timestamp y controller.

## Ownership exclusivo

```text
backend/weather/demo/constants.py
backend/weather/demo/generation.py
backend/weather/demo/validators.py
backend/weather/demo/loaders.py
backend/weather/views.py
backend/weather/tests/test_assets.py
backend/weather/tests/test_api.py
backend/media/demo-weather/demo-colombia-001/manifest.json
backend/media/demo-weather/demo-colombia-001/precipitation/**
backend/media/demo-weather/demo-colombia-001/pressure-isobars/**
frontend/features/weather/precipitation/**
frontend/features/weather/isobars/**
frontend/map/layers/precipitation/**
frontend/map/layers/isobars/**
```

Estos backend paths también fueron usados por fase 10, pero no existe
paralelismo entre E1 y E2. La fase 13 parte de su versión integrada.

## Archivos centrales prohibidos

```text
frontend/app/page.tsx
frontend/app/globals.css
frontend/lib/stores/weatherViewerStore.ts
frontend/lib/weather/viewerTypes.ts
frontend/map/WeatherMapController.ts
frontend/features/viewer/**
frontend/components/weather/LayerSelector/**
frontend/components/weather/WeatherLegend/**
frontend/e2e/flow-definitions.json
```

La fase entrega descriptor de capa/leyenda y adapter. La fase 14 amplía los
controles centrales.

## Alcance backend

### Precipitación

- Añadir definición `precipitation`, kind `scalar`, unidad `mm/h`, rango `0–40`.
- Generar seis WebP RGBA `1024×1216` con bbox/esquinas térmicas.
- Usar blobs elípticos suavizados que evolucionen moderadamente por timestamp.
- Incorporar gradiente latitudinal, seno/coseno y semilla fija; sin random
  runtime.
- Mantener suficiente transparencia para leer límites/aeropuertos.
- Agregar seis frames al manifiesto schema 2.
- Validar formato, modo, tamaño, path y completitud.

### Isobaras

- Generar seis `FeatureCollection<LineString>`.
- Presión base simulada y suave, entre `996` y `1024 hPa`.
- Contornos cada `4 hPa`.
- Se permite implementar marching squares durante autoría; no en runtime.
- Simplificar líneas para el zoom `4–9` sin salir del bbox.
- Cada feature incluye presión, timestamp y flags de simulación.
- Añadir descriptor `pressure-isobars` con seis paths a `overlays`.
- Validar GeoJSON, geometría, coordenadas, propiedades y cobertura.

### API

- Catálogo publica tercera capa y overlay.
- Endpoint de frames acepta `layer=precipitation`.
- Response conserva coverage, min/max, unidad y flags.
- Isobaras se resuelven por las URLs del catálogo.
- No crear endpoint separado ni generar contours al solicitar.

## Alcance frontend

### Precipitación

- Schema y service validan response/API igual que temperatura.
- Precarga WebP usa same-origin, abort y object URL con cleanup.
- Adapter usa `ImageSource`, opacidad fija `0.68` y fade MapLibre `0`.
- Mantener último frame válido durante una carga fallida.
- Exportar descriptor de leyenda con stops congelados.

### Isobaras

- Schema valida FeatureCollection y todas las propiedades.
- Service carga un solo GeoJSON por timestamp con abort/version.
- Adapter crea source, línea y labels hPa.
- `setVisible` no elimina/recrea resources.
- `setFrame` usa `GeoJSONSource.setData` de forma atómica.
- Labels evitan overlap excesivo y permanecen subordinados a aeropuertos.
- Falla del overlay emite error propio y permite ocultarlo.

## Fuera del alcance

- Valores de precipitación en picker.
- Radar, reflectividad, animación de tormentas o descargas eléctricas.
- Nubosidad, visibilidad, niebla o base de nubes.
- Presión en grid, heatmap o picker.
- Cálculo de contornos en navegador/request.
- Selector de opacidad o calidad.
- Modificar controles, store, controller o composición.

## Interfaces de entrega

```typescript
interface PrecipitationFrame {
  scenario: "demo-colombia-001";
  layer: "precipitation";
  timestamp: DemoTimestamp;
  unit: "mm/h";
  minimum: 0;
  maximum: 40;
  imageUrl: string;
  isSimulated: true;
  operationalUse: false;
}

interface IsobarFrame {
  id: "pressure-isobars";
  timestamp: DemoTimestamp;
  unit: "hPa";
  dataUrl: string;
  isSimulated: true;
  operationalUse: false;
}

interface IsobarLayerAdapter {
  initialize(): Promise<void>;
  setFrame(collection: IsobarFeatureCollection): void;
  setVisible(visible: boolean): void;
  reset(): void;
  destroy(): void;
}
```

Descriptor de leyenda:

```typescript
const PRECIPITATION_LEGEND = {
  title: "Precipitación simulada",
  unit: "mm/h",
  minimum: 0,
  maximum: 40,
  colorStops: PRECIPITATION_COLOR_STOPS,
} as const;
```

## Implementación ordenada

1. Extender constantes de layer/overlay manteniendo schema 2.
2. Implementar función determinística de precipitación y paleta.
3. Implementar autoría de presión y contornos GeoJSON.
4. Extender manifest generator y validadores exactos.
5. Generar dos escenarios temporales y comparar hashes.
6. Reemplazar escenario versionado con el comando atómico existente.
7. Extender catálogo/frame API y tests negativos.
8. Crear tipos, schemas y services frontend.
9. Crear adapter raster de precipitación reutilizando patrón térmico.
10. Crear adapter GeoJSON de isobaras con line/labels y cleanup.
11. Probar carga, cambio de timestamp, fallo y visibility.
12. Entregar descriptores/adapters sin editar controles centrales.

## Manejo de errores

- Manifiesto sin uno de los seis frames es inválido.
- WebP o GeoJSON corrupto produce `asset_unavailable`.
- GeoJSON con coordenada externa, NaN o presión fuera del rango se rechaza.
- Request obsoleto no reemplaza frame activo.
- Precipitación fallida conserva último frame y ofrece retry/cambio de capa.
- Isobaras fallidas se ocultan y emiten estado no bloqueante.
- Ocultar isobaras durante fetch impide que respuesta tardía las revele.
- Destroy aborta red, libera imágenes y elimina labels, lines y source.

## Pruebas dirigidas

### Backend

- manifiesto final contiene 18 frames y 6 overlay frames;
- layer/overlay definitions exactas;
- seis WebP con formato, modo, tamaño y hashes reproducibles;
- seis GeoJSON con features/props/coordenadas válidas;
- path traversal, frame faltante, presión inválida y geometría corrupta;
- catálogo publica overlay y precipitación;
- frame válido/invalid layer/invalid timestamp/asset unavailable.

### Frontend

- schemas aceptan fixtures válidos y rechazan flags/unidad/rango/path;
- service maneja success, HTTP error, JSON inválido y abort;
- raster adapter conserva frame durante failure y libera imágenes;
- isobar adapter crea IDs una vez, actualiza `setData` y respeta visibility;
- destroy parcial/completo es idempotente;
- descriptor de leyenda usa stops/rango congelados.

No crear E2E en esta fase.

## Criterios de aceptación

- [ ] Existen seis WebP y seis GeoJSON versionados y determinísticos.
- [ ] El manifiesto permanece schema 2 y conserva productos anteriores.
- [ ] Catálogo publica precipitación e isobaras con flags simulados.
- [ ] Precipitación cambia visualmente entre timestamps.
- [ ] Isobaras cambian de forma atómica y pueden ocultarse.
- [ ] Ningún copy usa radar, observación u oficial.
- [ ] Fallar overlay no inutiliza la capa principal.
- [ ] Adapters liberan imágenes, sources, layers y requests.
- [ ] No se añadió cálculo runtime ni servicio externo.
- [ ] Tests dirigidos pasan y no se editó wiring central.

## Handoff a fase 14

Entregar hashes, manifiesto final, paletas, descriptor de leyenda, IDs
MapLibre, adapters/services públicos, política de errores/fallback, comandos de
prueba y capturas de al menos `06Z` y `09Z`.

## Riesgos

- Contornos demasiado densos ensucian la escena. Simplificación y labels
  escasos tienen prioridad sobre precisión ficticia.
- Paleta intensa puede ocultar contexto aeronáutico. La opacidad es fija y se
  valida con aeropuertos/ruta superpuestos.
