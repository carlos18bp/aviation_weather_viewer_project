import {
  parseAirportFeatureCollection,
  parseAirportWeatherResponse,
  parseDemoAirportIcao,
  parseDemoTimestamp,
} from './airportSchemas';
import {
  DEMO_TIMESTAMPS,
  type AirportFeatureCollection,
  type AirportWeatherResponse,
  type DemoAirportIcao,
} from './types';
import { createAirportTrendPoints } from './trend/airportTrendSeries';
import type { AirportTrendPoint } from './trend/types';


const AIRPORTS_ENDPOINT = '/api/v1/airports';
const AIRPORT_WEATHER_ENDPOINT_PREFIX = '/api/v1/demo/airports';

export interface AirportRequestOptions {
  signal?: AbortSignal;
}

export class AirportServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AirportServiceError';
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serviceErrorFromResponse(status: number, payload: unknown): AirportServiceError {
  if (isRecord(payload) && isRecord(payload.error)) {
    const code = typeof payload.error.code === 'string' ? payload.error.code : 'request_failed';
    const message = typeof payload.error.message === 'string'
      ? payload.error.message
      : 'No se pudieron cargar los datos aeroportuarios simulados.';
    return new AirportServiceError(status, code, message);
  }

  return new AirportServiceError(
    status,
    'request_failed',
    'No se pudieron cargar los datos aeroportuarios simulados.',
  );
}

async function requestJson(url: string, options: AirportRequestOptions): Promise<unknown> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw serviceErrorFromResponse(response.status, null);
    }
    throw new AirportServiceError(
      response.status,
      'invalid_response',
      'La respuesta aeroportuaria no contiene JSON válido.',
    );
  }

  if (!response.ok) {
    throw serviceErrorFromResponse(response.status, payload);
  }

  return payload;
}

export async function fetchAirports(
  options: AirportRequestOptions = {},
): Promise<AirportFeatureCollection> {
  const payload = await requestJson(AIRPORTS_ENDPOINT, options);
  return parseAirportFeatureCollection(payload);
}

export async function fetchAirportWeather(
  icaoCode: string,
  timestamp: string,
  options: AirportRequestOptions = {},
): Promise<AirportWeatherResponse> {
  const normalizedIcaoCode = parseDemoAirportIcao(icaoCode);
  const normalizedTimestamp = parseDemoTimestamp(timestamp);
  const airportPath = `${AIRPORT_WEATHER_ENDPOINT_PREFIX}/${encodeURIComponent(normalizedIcaoCode)}/weather`;
  const url = `${airportPath}?timestamp=${encodeURIComponent(normalizedTimestamp)}`;
  const payload = await requestJson(url, options);
  return parseAirportWeatherResponse(payload, normalizedIcaoCode, normalizedTimestamp);
}

export async function fetchAirportWeatherSeries(
  icaoCode: DemoAirportIcao,
  options: AirportRequestOptions = {},
): Promise<readonly AirportTrendPoint[]> {
  const normalizedIcaoCode = parseDemoAirportIcao(icaoCode);
  const requestController = new AbortController();
  const abortRequest = () => requestController.abort();

  if (options.signal?.aborted) {
    requestController.abort();
  } else {
    options.signal?.addEventListener('abort', abortRequest, { once: true });
  }

  try {
    const responses = await Promise.all(
      DEMO_TIMESTAMPS.map((timestamp) => fetchAirportWeather(
        normalizedIcaoCode,
        timestamp,
        { signal: requestController.signal },
      )),
    );
    return createAirportTrendPoints(responses);
  } catch (error) {
    requestController.abort();
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', abortRequest);
  }
}
