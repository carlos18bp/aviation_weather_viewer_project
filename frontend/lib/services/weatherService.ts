import {
  DEMO_TIMESTAMPS,
  parseDemoTimestamp,
  type DemoTimestamp,
} from '@/features/airports';
import {
  AVIATION_BBOX,
  AVIATION_LAYER_DEFINITION_BY_ID,
  AVIATION_LAYER_IDS,
  expectedAviationImageUrl,
  expectedAviationValueUrl,
  type AviationLayerFrameDescriptor,
  type AviationLayerId,
} from '@/features/weather/aviation-layer-contracts';
import {
  createCloudBaseFrameService,
  type CloudBaseFrameService,
} from '@/features/weather/cloud-base';
import {
  createCloudCoverFrameService,
  type CloudCoverFrameService,
} from '@/features/weather/cloud-cover';
import {
  parseIsobarCatalogResponse,
  type IsobarFrame,
} from '@/features/weather/isobars';
import {
  fetchPrecipitationFrame,
  PRECIPITATION_LAYER_ID,
  PRECIPITATION_LEGEND,
} from '@/features/weather/precipitation';
import {
  fetchTemperatureFrame,
  TEMPERATURE_LEGEND,
} from '@/features/weather/temperature';
import {
  createVisibilityLayerService,
  type VisibilityLayerService,
} from '@/features/weather/visibility';
import { WIND_FIELD_BBOX, WIND_LEGEND } from '@/features/weather/wind';
import {
  createWindGustLayerService,
  type WindGustLayerService,
} from '@/features/weather/wind-gusts';
import type {
  WeatherLayerId,
  WeatherMapFrame,
} from '@/lib/weather/viewerTypes';
import { parseWindField } from '@/map/renderers/wind';


const CATALOG_ENDPOINT = '/api/v1/demo/weather/catalog';
const FRAME_ENDPOINT = '/api/v1/demo/weather/frames';
const SCENARIO_CODE = 'demo-colombia-001';
const SCENARIO_DATE = '2026-01-15';
const MANIFEST_SCHEMA_VERSION = 3;

const CATALOG_LAYER_ORDER = Object.freeze([
  'temperature',
  'wind',
  'precipitation',
  ...AVIATION_LAYER_IDS,
] as const satisfies readonly WeatherLayerId[]);

type UnknownRecord = Record<string, unknown>;

export interface WeatherCatalogLayer {
  id: WeatherLayerId;
  name: string;
  category: 'essential' | 'aviation';
  kind: 'scalar' | 'vector';
  unit: '°C' | 'kt' | 'mm/h' | '%' | 'ft AGL' | 'km';
  minimum: number;
  maximum: number;
  supportsPointValue: boolean;
  simulated: true;
}

export interface WeatherCatalog {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  scenario: {
    code: typeof SCENARIO_CODE;
    name: string;
    scenarioDate: typeof SCENARIO_DATE;
    isSimulated: true;
    operationalUse: false;
  };
  layers: readonly WeatherCatalogLayer[];
  isobarFrames: readonly IsobarFrame[];
  timestamps: readonly DemoTimestamp[];
}

export interface WeatherRequestOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

export interface WeatherFrameService {
  load(
    layer: WeatherLayerId,
    timestamp: DemoTimestamp,
    signal: AbortSignal,
  ): Promise<WeatherMapFrame>;
  retain(layer: WeatherLayerId, timestamps: readonly DemoTimestamp[]): void;
  destroy(): void;
}

export interface CreateWeatherFrameServiceOptions {
  fetcher?: typeof fetch;
}

export class WeatherServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 0, code = 'invalid_response') {
    super(message);
    this.name = 'WeatherServiceError';
    this.status = status;
    this.code = code;
  }
}

function fail(message: string): never {
  throw new WeatherServiceError(message);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown, label: string): UnknownRecord {
  if (!isRecord(value)) fail(`${label} no cumple el contrato del escenario.`);
  return value;
}

function hasExactKeys(value: UnknownRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function responseError(status: number, payload: unknown): WeatherServiceError {
  if (isRecord(payload) && isRecord(payload.error)) {
    const code = typeof payload.error.code === 'string'
      ? payload.error.code
      : 'request_failed';
    const message = typeof payload.error.message === 'string'
      ? payload.error.message
      : 'No se pudieron cargar los datos meteorológicos simulados.';
    return new WeatherServiceError(message, status, code);
  }
  return new WeatherServiceError(
    'No se pudieron cargar los datos meteorológicos simulados.',
    status,
    'request_failed',
  );
}

async function requestJson(
  url: string,
  options: WeatherRequestOptions,
): Promise<unknown> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) throw responseError(response.status, null);
    throw new WeatherServiceError(
      'La respuesta meteorológica no contiene JSON válido.',
      response.status,
    );
  }
  if (!response.ok) throw responseError(response.status, payload);
  return payload;
}

function expectedCatalogLayer(id: WeatherLayerId) {
  if (id === 'temperature') {
    return {
      category: 'essential' as const,
      kind: 'scalar' as const,
      unit: TEMPERATURE_LEGEND.unit,
      minimum: TEMPERATURE_LEGEND.minimum,
      maximum: TEMPERATURE_LEGEND.maximum,
      supportsPointValue: true,
    };
  }
  if (id === 'wind') {
    return {
      category: 'essential' as const,
      kind: 'vector' as const,
      unit: WIND_LEGEND.unit,
      minimum: WIND_LEGEND.minimum,
      maximum: WIND_LEGEND.maximum,
      supportsPointValue: true,
    };
  }
  if (id === PRECIPITATION_LAYER_ID) {
    return {
      category: 'essential' as const,
      kind: 'scalar' as const,
      unit: PRECIPITATION_LEGEND.unit,
      minimum: PRECIPITATION_LEGEND.minimum,
      maximum: PRECIPITATION_LEGEND.maximum,
      supportsPointValue: false,
    };
  }
  const definition = AVIATION_LAYER_DEFINITION_BY_ID[id];
  return {
    category: definition.category,
    kind: definition.kind,
    unit: definition.unit,
    minimum: definition.minimum,
    maximum: definition.maximum,
    supportsPointValue: definition.supportsPointValue,
  };
}

function parseCatalogLayer(value: unknown, expectedId: WeatherLayerId): WeatherCatalogLayer {
  const layer = asRecord(value, 'La capa del catálogo');
  const expected = expectedCatalogLayer(expectedId);
  if (
    !hasExactKeys(layer, [
      'id',
      'name',
      'category',
      'kind',
      'unit',
      'minimum',
      'maximum',
      'supports_point_value',
    ])
    || layer.id !== expectedId
    || layer.category !== expected.category
    || layer.kind !== expected.kind
    || layer.unit !== expected.unit
    || layer.minimum !== expected.minimum
    || layer.maximum !== expected.maximum
    || layer.supports_point_value !== expected.supportsPointValue
    || typeof layer.name !== 'string'
    || layer.name.trim() === ''
  ) {
    fail(`La capa ${expectedId} no cumple el contrato schema 3.`);
  }

  return Object.freeze({
    id: expectedId,
    name: layer.name.trim(),
    ...expected,
    simulated: true as const,
  });
}

export function parseWeatherCatalog(value: unknown): WeatherCatalog {
  const catalog = asRecord(value, 'El catálogo');
  if (
    !hasExactKeys(catalog, [
      'schema_version',
      'scenario',
      'layers',
      'timestamps',
      'overlays',
    ])
    || catalog.schema_version !== MANIFEST_SCHEMA_VERSION
  ) {
    fail('El catálogo debe cumplir exactamente weather manifest schema 3.');
  }

  const scenario = asRecord(catalog.scenario, 'El escenario');
  if (
    !hasExactKeys(scenario, [
      'code',
      'name',
      'scenario_date',
      'is_simulated',
      'operational_use',
    ])
    || scenario.code !== SCENARIO_CODE
    || scenario.scenario_date !== SCENARIO_DATE
    || scenario.is_simulated !== true
    || scenario.operational_use !== false
    || typeof scenario.name !== 'string'
    || scenario.name.trim() === ''
  ) {
    fail('El catálogo no corresponde al escenario congelado.');
  }

  if (
    !Array.isArray(catalog.timestamps)
    || catalog.timestamps.length !== DEMO_TIMESTAMPS.length
  ) {
    fail('El catálogo debe contener los seis timestamps congelados.');
  }
  const timestamps = catalog.timestamps.map((timestamp, index) => {
    const parsed = parseDemoTimestamp(timestamp);
    if (parsed !== DEMO_TIMESTAMPS[index]) {
      fail('Los timestamps del catálogo no conservan el orden congelado.');
    }
    return parsed;
  });

  if (!Array.isArray(catalog.layers) || catalog.layers.length !== CATALOG_LAYER_ORDER.length) {
    fail('El catálogo debe contener exactamente las siete capas meteorológicas.');
  }
  const layers = catalog.layers.map((layer, index) => (
    parseCatalogLayer(layer, CATALOG_LAYER_ORDER[index])
  ));

  return Object.freeze({
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    scenario: Object.freeze({
      code: SCENARIO_CODE,
      name: scenario.name.trim(),
      scenarioDate: SCENARIO_DATE,
      isSimulated: true,
      operationalUse: false,
    }),
    layers: Object.freeze(layers),
    isobarFrames: parseIsobarCatalogResponse(value),
    timestamps: Object.freeze(timestamps),
  });
}

function expectedWindUrl(timestamp: DemoTimestamp): string {
  return `/media/demo-weather/${SCENARIO_CODE}/wind/${timestamp.slice(11, 13)}Z.json`;
}

function parseWindFrameMetadata(value: unknown, timestamp: DemoTimestamp): string {
  const frame = asRecord(value, 'El frame de viento');
  const coverage = asRecord(frame.coverage, 'La cobertura del frame');
  const expectedUrl = expectedWindUrl(timestamp);
  if (
    !hasExactKeys(frame, [
      'scenario',
      'layer',
      'timestamp',
      'unit',
      'is_simulated',
      'operational_use',
      'coverage',
      'minimum',
      'maximum',
      'data_url',
    ])
    || !hasExactKeys(coverage, ['west', 'south', 'east', 'north'])
    || frame.scenario !== SCENARIO_CODE
    || frame.layer !== 'wind'
    || frame.timestamp !== timestamp
    || frame.unit !== 'kt'
    || frame.is_simulated !== true
    || frame.operational_use !== false
    || coverage.west !== WIND_FIELD_BBOX[0]
    || coverage.south !== WIND_FIELD_BBOX[1]
    || coverage.east !== WIND_FIELD_BBOX[2]
    || coverage.north !== WIND_FIELD_BBOX[3]
    || frame.minimum !== WIND_LEGEND.minimum
    || frame.maximum !== WIND_LEGEND.maximum
    || frame.data_url !== expectedUrl
  ) {
    fail('El frame de viento no cumple el contrato congelado.');
  }
  return expectedUrl;
}

function parseAviationFrameMetadata(
  value: unknown,
  layer: AviationLayerId,
  timestamp: DemoTimestamp,
): AviationLayerFrameDescriptor {
  const frame = asRecord(value, `El frame ${layer}`);
  const coverage = asRecord(frame.coverage, 'La cobertura del frame');
  const definition = AVIATION_LAYER_DEFINITION_BY_ID[layer];
  const imageUrl = expectedAviationImageUrl(layer, timestamp);
  const valueDataUrl = expectedAviationValueUrl(layer, timestamp);
  if (
    !hasExactKeys(frame, [
      'scenario',
      'layer',
      'timestamp',
      'unit',
      'is_simulated',
      'operational_use',
      'coverage',
      'minimum',
      'maximum',
      'data_url',
      'value_data_url',
    ])
    || !hasExactKeys(coverage, ['west', 'south', 'east', 'north'])
    || frame.scenario !== SCENARIO_CODE
    || frame.layer !== layer
    || frame.timestamp !== timestamp
    || frame.unit !== definition.unit
    || frame.minimum !== definition.minimum
    || frame.maximum !== definition.maximum
    || frame.is_simulated !== true
    || frame.operational_use !== false
    || coverage.west !== AVIATION_BBOX[0]
    || coverage.south !== AVIATION_BBOX[1]
    || coverage.east !== AVIATION_BBOX[2]
    || coverage.north !== AVIATION_BBOX[3]
    || frame.data_url !== imageUrl
    || frame.value_data_url !== valueDataUrl
  ) {
    fail(`El frame ${layer} no cumple el contrato schema 3.`);
  }

  return {
    layer,
    timestamp,
    unit: definition.unit,
    minimum: definition.minimum,
    maximum: definition.maximum,
    imageUrl,
    valueDataUrl,
    isSimulated: true,
    operationalUse: false,
  };
}

class DefaultWeatherFrameService implements WeatherFrameService {
  private readonly fetcher: typeof fetch;
  private readonly cloudCover: CloudCoverFrameService;
  private readonly cloudBase: CloudBaseFrameService;
  private readonly visibility: VisibilityLayerService;
  private readonly windGusts: WindGustLayerService;
  private destroyed = false;

  constructor(options: CreateWeatherFrameServiceOptions = {}) {
    const fetcher = (options.fetcher ?? globalThis.fetch).bind(globalThis) as typeof fetch;
    this.fetcher = fetcher;
    this.cloudCover = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 3 },
      fetcher,
    });
    this.cloudBase = createCloudBaseFrameService({
      cachePolicy: { maxEntries: 3 },
      fetcher,
    });
    this.visibility = createVisibilityLayerService({
      maxCachedFrames: 3,
      fetcher,
    });
    this.windGusts = createWindGustLayerService({
      maxCachedFrames: 3,
      fetcher,
    });
  }

  async load(
    layer: WeatherLayerId,
    timestamp: DemoTimestamp,
    signal: AbortSignal,
  ): Promise<WeatherMapFrame> {
    if (this.destroyed) throw new Error('Cannot use a destroyed weather frame service.');
    if (layer === 'temperature') {
      const frame = await fetchTemperatureFrame(timestamp, {
        signal,
        fetcher: this.fetcher,
      });
      return { layer, timestamp: frame.timestamp, imageUrl: frame.imageUrl };
    }
    if (layer === PRECIPITATION_LAYER_ID) {
      return fetchPrecipitationFrame(timestamp, { signal, fetcher: this.fetcher });
    }
    if (layer === 'wind') {
      const query = new URLSearchParams({ layer, timestamp });
      const metadata = await requestJson(`${FRAME_ENDPOINT}?${query}`, {
        signal,
        fetcher: this.fetcher,
      });
      const dataUrl = parseWindFrameMetadata(metadata, timestamp);
      const field = parseWindField(await requestJson(dataUrl, {
        signal,
        fetcher: this.fetcher,
      }));
      if (field.timestamp !== timestamp) {
        fail('El campo U/V no corresponde al timestamp solicitado.');
      }
      return { layer, timestamp, field };
    }

    const query = new URLSearchParams({ layer, timestamp });
    const metadata = await requestJson(`${FRAME_ENDPOINT}?${query}`, {
      signal,
      fetcher: this.fetcher,
    });
    const descriptor = parseAviationFrameMetadata(metadata, layer, timestamp);
    if (layer === 'cloud-cover') {
      return { layer, timestamp, frame: await this.cloudCover.load(descriptor, signal) };
    }
    if (layer === 'cloud-base') {
      return { layer, timestamp, frame: await this.cloudBase.load(descriptor, signal) };
    }
    if (layer === 'visibility') {
      return { layer, timestamp, frame: await this.visibility.load(descriptor, { signal }) };
    }
    return { layer, timestamp, frame: await this.windGusts.load(descriptor, { signal }) };
  }

  retain(layer: WeatherLayerId, timestamps: readonly DemoTimestamp[]): void {
    if (layer === 'cloud-cover') this.cloudCover.retain(timestamps);
    if (layer === 'cloud-base') this.cloudBase.retain(timestamps);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.windGusts.destroy();
    this.visibility.destroy();
    this.cloudBase.destroy();
    this.cloudCover.destroy();
  }
}

let defaultFrameService: WeatherFrameService | null = null;

export function createWeatherFrameService(
  options: CreateWeatherFrameServiceOptions = {},
): WeatherFrameService {
  return new DefaultWeatherFrameService(options);
}

export async function fetchWeatherCatalog(
  options: WeatherRequestOptions = {},
): Promise<WeatherCatalog> {
  return parseWeatherCatalog(await requestJson(CATALOG_ENDPOINT, options));
}

export function fetchWeatherFrame(
  layer: WeatherLayerId,
  timestamp: string,
  options: WeatherRequestOptions = {},
): Promise<WeatherMapFrame> {
  const requestedTimestamp = parseDemoTimestamp(timestamp);
  if (!defaultFrameService) {
    defaultFrameService = createWeatherFrameService({ fetcher: options.fetcher });
  }
  const signal = options.signal ?? new AbortController().signal;
  return defaultFrameService.load(layer, requestedTimestamp, signal);
}

export function destroyDefaultWeatherFrameService(): void {
  defaultFrameService?.destroy();
  defaultFrameService = null;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
