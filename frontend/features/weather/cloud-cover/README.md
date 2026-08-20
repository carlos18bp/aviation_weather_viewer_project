# Handoff Fase 19 — capas de nubes

## Base común de Ola M2

`8180ff0bdcdee6fc99b64461d7bc7878de9bc02c`

La rama consume únicamente `AVIATION_LAYER_FRAME_DESCRIPTORS`,
`AVIATION_LAYER_DEFINITION_BY_ID`, `parseAviationScalarGrid` y
`sampleAviationScalarGrid`, publicados por Fase 18. No consulta metadata ni
modifica el catálogo vivo.

## Descriptores y exports

- `CLOUD_COVER_FRAME_DESCRIPTORS`: seis frames `00Z…15Z`, `%`, rango `0–100`,
  `isSimulated=true`, `operationalUse=false`.
- `CLOUD_BASE_FRAME_DESCRIPTORS`: seis frames `00Z…15Z`, `ft AGL`, rango
  `300–15000`, con los mismos flags.
- Cada descriptor usa exclusivamente
  `/media/demo-weather/demo-colombia-001/<layer>/<HH>Z.webp` y
  `/media/demo-weather/demo-colombia-001/<layer>-values/<HH>Z.json`.
- Los barrels de feature publican leyendas, parsers, samplers, tipos,
  `createCloudCoverFrameService` y `createCloudBaseFrameService`.
- Los barrels MapLibre publican `CloudLayerAdapter`, las dos factories y los
  cuatro IDs reservados.

IDs:

```text
weather-cloud-cover-source
weather-cloud-cover-layer
weather-cloud-base-source
weather-cloud-base-layer
```

## Cache y errores

Cada service exige una política inyectada `{ maxEntries: 1 | 2 | 3 }`. `load`
carga WebP y value grid conjuntamente, convierte el blob a object URL y evita
que una respuesta sustituida entre al cache. `retain()` aplica la ventana que
Fase 23 derive del perfil de Fase 16. Evicción, abort tardío y `destroy()`
revocan sus object URLs.

Un fallo de imagen rechaza el frame y el adapter conserva el último raster
confirmado. Un fallo HTTP, JSON o schema del value grid entrega el raster con
`valueGrid=null` y un `CloudLayerValueRequestError`. Un `null` dentro de un grid
válido de base de nubes conserva el significado exacto:

```text
Sin base significativa en este punto simulado
```

## Registro exacto para Fase 23

```typescript
import type { DemoTimestamp } from '@/features/airports';
import {
  CLOUD_BASE_FRAME_DESCRIPTORS,
  CLOUD_BASE_OPACITY,
  createCloudBaseFrameService,
} from '@/features/weather/cloud-base';
import {
  CLOUD_COVER_FRAME_DESCRIPTORS,
  CLOUD_COVER_OPACITY,
  createCloudCoverFrameService,
  type CloudFrameCachePolicy,
} from '@/features/weather/cloud-cover';
import { createCloudBaseLayerAdapter } from '@/map/layers/cloud-base';
import { createCloudCoverLayerAdapter } from '@/map/layers/cloud-cover';

const cachePolicy: CloudFrameCachePolicy = { maxEntries: 3 };
const cloudCoverService = createCloudCoverFrameService({ cachePolicy });
const cloudBaseService = createCloudBaseFrameService({ cachePolicy });
const cloudCoverAdapter = createCloudCoverLayerAdapter(map);
const cloudBaseAdapter = createCloudBaseLayerAdapter(map);

await Promise.all([
  cloudCoverAdapter.initialize(),
  cloudBaseAdapter.initialize(),
]);
cloudCoverAdapter.setOpacity(CLOUD_COVER_OPACITY);
cloudBaseAdapter.setOpacity(CLOUD_BASE_OPACITY);

const cloudAdapters = {
  'cloud-cover': cloudCoverAdapter,
  'cloud-base': cloudBaseAdapter,
} as const;

async function setCloudCoverFrame(timestamp: DemoTimestamp, signal: AbortSignal) {
  const descriptor = CLOUD_COVER_FRAME_DESCRIPTORS.find(
    (candidate) => candidate.timestamp === timestamp,
  );
  if (!descriptor) throw new Error(`Missing cloud-cover descriptor for ${timestamp}.`);
  await cloudCoverAdapter.setFrame(await cloudCoverService.load(descriptor, signal));
}

async function setCloudBaseFrame(timestamp: DemoTimestamp, signal: AbortSignal) {
  const descriptor = CLOUD_BASE_FRAME_DESCRIPTORS.find(
    (candidate) => candidate.timestamp === timestamp,
  );
  if (!descriptor) throw new Error(`Missing cloud-base descriptor for ${timestamp}.`);
  await cloudBaseAdapter.setFrame(await cloudBaseService.load(descriptor, signal));
}

// Teardown inverso: MapLibre deja de consumir los URLs antes de revocarlos.
cloudAdapters['cloud-base'].destroy();
cloudAdapters['cloud-cover'].destroy();
cloudBaseService.destroy();
cloudCoverService.destroy();
```

Fase 23 añadirá las claves `'cloud-cover'` y `'cloud-base'` al registry central,
coordinará cuál está visible y pasará a `retain()` las horas permitidas por el
perfil activo. No debe duplicar services, sources o layers.

## Evidencia aislada

El script `map/layers/cloud-cover/testing/captureCloudLayers.mjs` usa los WebP
locales como data URLs y falla si detecta un request HTTP externo.

| Hora | Captura | SHA-256 |
|---|---|---|
| 06Z | `/tmp/phase-19-cloud-layers-06Z.png` | `d249f589f5967b972dbfb80f8afcf4f5f6bbe3d8f833d0cfadfea2adc9a4b32c` |
| 09Z | `/tmp/phase-19-cloud-layers-09Z.png` | `56add74dcc6a093aa31809c5bb49da4032fb337d80cd08d7e0645f02cd0839ac` |

El harness fake MapLibre está en
`map/layers/cloud-cover/testing/fakeMapLibreHarness.ts`. La verificación
dirigida cubre 33 tests: 12 de schemas/samplers, 12 de services y 9 de adapters.
