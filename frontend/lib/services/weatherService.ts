import {
  DEMO_TIMESTAMPS,
  parseDemoTimestamp,
  type DemoTimestamp,
} from '@/features/airports';
import {
  fetchTemperatureFrame,
  TEMPERATURE_LEGEND,
} from '@/features/weather/temperature';
import {
  fetchPrecipitationFrame,
  PRECIPITATION_LAYER_ID,
  PRECIPITATION_LEGEND,
} from '@/features/weather/precipitation';
import {
  parseIsobarCatalogResponse,
  type IsobarFrame,
} from '@/features/weather/isobars';
import {
  WIND_FIELD_BBOX,
  WIND_LEGEND,
} from '@/features/weather/wind';
import type {
  WeatherLayerId,
  WeatherMapFrame,
} from '@/lib/weather/viewerTypes';
import { parseWindField } from '@/map/renderers/wind';


const CATALOG_ENDPOINT = '/api/v1/demo/weather/catalog';
const FRAME_ENDPOINT = '/api/v1/demo/weather/frames';
const SCENARIO_CODE = 'demo-colombia-001';
const SCENARIO_DATE = '2026-01-15';

type UnknownRecord = Record<string, unknown>;

export interface WeatherCatalogLayer {
  id: WeatherLayerId;
  name: string;
  kind: 'scalar' | 'vector';
  unit: '°C' | 'kt' | 'mm/h';
  minimum: number;
  maximum: number;
}

export interface WeatherCatalog {
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
  if (!isRecord(value)) {
    fail(`${label} no cumple el contrato del escenario.`);
  }
  return value;
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
    if (!response.ok) {
      throw responseError(response.status, null);
    }
    throw new WeatherServiceError(
      'La respuesta meteorológica no contiene JSON válido.',
      response.status,
    );
  }

  if (!response.ok) {
    throw responseError(response.status, payload);
  }
  return payload;
}

function parseCatalogLayer(value: unknown): WeatherCatalogLayer {
  const layer = asRecord(value, 'La capa del catálogo');
  const expected = layer.id === 'temperature'
    ? {
        id: 'temperature' as const,
        kind: 'scalar' as const,
        unit: TEMPERATURE_LEGEND.unit,
        minimum: TEMPERATURE_LEGEND.minimum,
        maximum: TEMPERATURE_LEGEND.maximum,
      }
    : layer.id === 'wind'
      ? {
          id: 'wind' as const,
          kind: 'vector' as const,
          unit: WIND_LEGEND.unit,
          minimum: WIND_LEGEND.minimum,
          maximum: WIND_LEGEND.maximum,
        }
      : layer.id === PRECIPITATION_LAYER_ID
        ? {
            id: PRECIPITATION_LAYER_ID,
            kind: 'scalar' as const,
            unit: PRECIPITATION_LEGEND.unit,
            minimum: PRECIPITATION_LEGEND.minimum,
            maximum: PRECIPITATION_LEGEND.maximum,
          }
        : null;

  if (
    !expected
    || layer.kind !== expected.kind
    || layer.unit !== expected.unit
    || layer.minimum !== expected.minimum
    || layer.maximum !== expected.maximum
    || typeof layer.name !== 'string'
    || layer.name.trim() === ''
  ) {
    fail('El catálogo contiene una capa meteorológica inválida.');
  }

  return { ...expected, name: layer.name };
}

export function parseWeatherCatalog(value: unknown): WeatherCatalog {
  const catalog = asRecord(value, 'El catálogo');
  const scenario = asRecord(catalog.scenario, 'El escenario');
  if (
    scenario.code !== SCENARIO_CODE
    || scenario.scenario_date !== SCENARIO_DATE
    || scenario.is_simulated !== true
    || scenario.operational_use !== false
    || typeof scenario.name !== 'string'
    || scenario.name.trim() === ''
  ) {
    fail('El catálogo no corresponde al escenario congelado.');
  }

  if (!Array.isArray(catalog.timestamps) || catalog.timestamps.length !== DEMO_TIMESTAMPS.length) {
    fail('El catálogo debe contener los seis timestamps congelados.');
  }
  const timestamps = catalog.timestamps.map((timestamp, index) => {
    const parsed = parseDemoTimestamp(timestamp);
    if (parsed !== DEMO_TIMESTAMPS[index]) {
      fail('Los timestamps del catálogo no conservan el orden congelado.');
    }
    return parsed;
  });

  if (!Array.isArray(catalog.layers) || catalog.layers.length !== 3) {
    fail('El catálogo debe contener temperatura, viento y precipitación.');
  }
  const layers = catalog.layers.map(parseCatalogLayer);
  if (new Set(layers.map((layer) => layer.id)).size !== 3) {
    fail('El catálogo debe contener una sola definición por cada capa.');
  }
  const isobarFrames = parseIsobarCatalogResponse(value);

  return {
    scenario: {
      code: SCENARIO_CODE,
      name: scenario.name,
      scenarioDate: SCENARIO_DATE,
      isSimulated: true,
      operationalUse: false,
    },
    layers,
    isobarFrames,
    timestamps,
  };
}

function expectedWindUrl(timestamp: DemoTimestamp): string {
  return `/media/demo-weather/${SCENARIO_CODE}/wind/${timestamp.slice(11, 13)}Z.json`;
}

function parseWindFrameMetadata(
  value: unknown,
  timestamp: DemoTimestamp,
): string {
  const frame = asRecord(value, 'El frame de viento');
  const coverage = asRecord(frame.coverage, 'La cobertura del frame');
  const expectedUrl = expectedWindUrl(timestamp);
  if (
    frame.scenario !== SCENARIO_CODE
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

export async function fetchWeatherCatalog(
  options: WeatherRequestOptions = {},
): Promise<WeatherCatalog> {
  return parseWeatherCatalog(await requestJson(CATALOG_ENDPOINT, options));
}

export async function fetchWeatherFrame(
  layer: WeatherLayerId,
  timestamp: string,
  options: WeatherRequestOptions = {},
): Promise<WeatherMapFrame> {
  const requestedTimestamp = parseDemoTimestamp(timestamp);
  if (layer === 'temperature') {
    const frame = await fetchTemperatureFrame(requestedTimestamp, options);
    return {
      layer: 'temperature',
      timestamp: frame.timestamp,
      imageUrl: frame.imageUrl,
    };
  }
  if (layer === 'precipitation') {
    return fetchPrecipitationFrame(requestedTimestamp, options);
  }

  const query = new URLSearchParams({ layer, timestamp: requestedTimestamp });
  const metadata = await requestJson(`${FRAME_ENDPOINT}?${query}`, options);
  const dataUrl = parseWindFrameMetadata(metadata, requestedTimestamp);
  const field = parseWindField(await requestJson(dataUrl, options));
  if (field.timestamp !== requestedTimestamp) {
    fail('El campo U/V no corresponde al timestamp solicitado.');
  }

  return {
    layer: 'wind',
    timestamp: requestedTimestamp,
    field,
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
