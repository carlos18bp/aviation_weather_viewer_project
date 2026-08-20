import {
  DEMO_TIMESTAMPS,
  parseDemoTimestamp,
  type DemoTimestamp,
} from '@/features/airports';
import type { WindField } from '@/features/weather/wind';
import {
  parseWindField,
  WindFieldValidationError,
} from '@/map/renderers/wind';

import { WEATHER_PICKER_FRAME_ENDPOINT } from './constants';
import {
  parsePickerFrameDescriptor,
  parseTemperatureValueGrid,
  WeatherPickerValidationError,
} from './pickerSchema';
import type { WeatherPickerData } from './types';

export interface FetchWeatherPickerDataOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  wind?: WindField;
}

export interface PreloadWeatherPickerDataOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  windByTimestamp?: Partial<Record<DemoTimestamp, WindField>>;
}

export class WeatherPickerRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'WeatherPickerRequestError';
    this.status = status;
  }
}

function abortError(): DOMException {
  return new DOMException('Weather picker loading was aborted.', 'AbortError');
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function requestJson(
  url: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch,
): Promise<unknown> {
  const response = await fetcher(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new WeatherPickerRequestError(
      `Weather picker request failed with status ${response.status}.`,
      response.status,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new WeatherPickerRequestError(
      'Weather picker response is not valid JSON.',
      response.status,
    );
  }
}

function frameUrl(layer: 'temperature' | 'wind', timestamp: DemoTimestamp): string {
  const query = new URLSearchParams({ layer, timestamp });
  return `${WEATHER_PICKER_FRAME_ENDPOINT}?${query}`;
}

async function fetchTemperatureGrid(
  timestamp: DemoTimestamp,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch,
) {
  const descriptor = parsePickerFrameDescriptor(
    await requestJson(frameUrl('temperature', timestamp), signal, fetcher),
    'temperature',
    timestamp,
  );
  if (!descriptor.valueDataUrl) {
    throw new WeatherPickerValidationError(
      'El descriptor térmico no contiene value_data_url.',
    );
  }
  return parseTemperatureValueGrid(
    await requestJson(descriptor.valueDataUrl, signal, fetcher),
    timestamp,
  );
}

async function fetchWindField(
  timestamp: DemoTimestamp,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch,
): Promise<WindField> {
  const descriptor = parsePickerFrameDescriptor(
    await requestJson(frameUrl('wind', timestamp), signal, fetcher),
    'wind',
    timestamp,
  );
  const field = parseWindField(await requestJson(descriptor.dataUrl, signal, fetcher));
  if (field.timestamp !== timestamp) {
    throw new WindFieldValidationError([
      'timestamp must match the requested picker timestamp',
    ]);
  }
  return field;
}

function validateInjectedWind(field: WindField, timestamp: DemoTimestamp): WindField {
  const parsed = parseWindField(field);
  if (parsed.timestamp !== timestamp) {
    throw new WindFieldValidationError([
      'timestamp must match the requested picker timestamp',
    ]);
  }
  return parsed;
}

export async function fetchWeatherPickerData(
  timestamp: string,
  options: FetchWeatherPickerDataOptions = {},
): Promise<WeatherPickerData> {
  const requestedTimestamp = parseDemoTimestamp(timestamp);
  const fetcher = options.fetcher ?? fetch;
  const [temperature, wind] = await Promise.all([
    fetchTemperatureGrid(requestedTimestamp, options.signal, fetcher),
    options.wind
      ? Promise.resolve(validateInjectedWind(options.wind, requestedTimestamp))
      : fetchWindField(requestedTimestamp, options.signal, fetcher),
  ]);
  return { timestamp: requestedTimestamp, temperature, wind };
}

function linkAbortSignal(
  signal: AbortSignal | undefined,
  controller: AbortController,
): () => void {
  const handleAbort = () => controller.abort();
  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener('abort', handleAbort, { once: true });
  }
  return () => signal?.removeEventListener('abort', handleAbort);
}

function adjacentTimestamps(timestamp: DemoTimestamp): DemoTimestamp[] {
  const index = DEMO_TIMESTAMPS.indexOf(timestamp);
  return [DEMO_TIMESTAMPS[index - 1], DEMO_TIMESTAMPS[index + 1]].filter(
    (candidate): candidate is DemoTimestamp => candidate !== undefined,
  );
}

export class WeatherPickerDataService {
  private readonly cache = new Map<DemoTimestamp, WeatherPickerData>();
  private readonly preloadControllers = new Map<DemoTimestamp, AbortController>();
  private activeTimestamp: DemoTimestamp | null = null;
  private activeController: AbortController | null = null;
  private requestVersion = 0;
  private destroyed = false;

  async load(
    timestamp: string,
    options: FetchWeatherPickerDataOptions = {},
  ): Promise<WeatherPickerData> {
    this.assertUsable();
    const requestedTimestamp = parseDemoTimestamp(timestamp);
    const requestVersion = ++this.requestVersion;
    this.activeTimestamp = requestedTimestamp;
    this.activeController?.abort();
    this.activeController = null;
    this.preloadControllers.get(requestedTimestamp)?.abort();
    this.preloadControllers.delete(requestedTimestamp);
    this.prune(requestedTimestamp);

    if (options.signal?.aborted) {
      throw abortError();
    }
    const cached = this.cache.get(requestedTimestamp);
    if (cached) {
      return cached;
    }

    const controller = new AbortController();
    this.activeController = controller;
    const unlinkAbort = linkAbortSignal(options.signal, controller);
    try {
      const data = await fetchWeatherPickerData(requestedTimestamp, {
        ...options,
        signal: controller.signal,
      });
      if (
        this.destroyed
        || controller.signal.aborted
        || requestVersion !== this.requestVersion
        || requestedTimestamp !== this.activeTimestamp
      ) {
        throw abortError();
      }
      this.cache.set(requestedTimestamp, data);
      return data;
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        throw abortError();
      }
      throw error;
    } finally {
      unlinkAbort();
      if (this.activeController === controller) {
        this.activeController = null;
      }
    }
  }

  async preloadAdjacent(
    timestamp: string,
    options: PreloadWeatherPickerDataOptions = {},
  ): Promise<void> {
    this.assertUsable();
    const requestedTimestamp = parseDemoTimestamp(timestamp);
    if (this.activeTimestamp !== requestedTimestamp) {
      return;
    }

    const tasks = adjacentTimestamps(requestedTimestamp).map(async (candidate) => {
      if (this.cache.has(candidate) || this.preloadControllers.has(candidate)) {
        return;
      }
      const controller = new AbortController();
      this.preloadControllers.set(candidate, controller);
      const unlinkAbort = linkAbortSignal(options.signal, controller);
      try {
        const data = await fetchWeatherPickerData(candidate, {
          fetcher: options.fetcher,
          signal: controller.signal,
          wind: options.windByTimestamp?.[candidate],
        });
        if (
          !this.destroyed
          && !controller.signal.aborted
          && this.activeTimestamp === requestedTimestamp
        ) {
          this.cache.set(candidate, data);
        }
      } finally {
        unlinkAbort();
        if (this.preloadControllers.get(candidate) === controller) {
          this.preloadControllers.delete(candidate);
        }
      }
    });
    await Promise.all(tasks);
    this.prune(requestedTimestamp);
  }

  getCached(timestamp: string): WeatherPickerData | null {
    const requestedTimestamp = parseDemoTimestamp(timestamp);
    return this.cache.get(requestedTimestamp) ?? null;
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    ++this.requestVersion;
    this.activeController?.abort();
    this.activeController = null;
    for (const controller of this.preloadControllers.values()) {
      controller.abort();
    }
    this.preloadControllers.clear();
    this.cache.clear();
    this.activeTimestamp = null;
  }

  private prune(activeTimestamp: DemoTimestamp): void {
    const allowed = new Set<DemoTimestamp>([
      activeTimestamp,
      ...adjacentTimestamps(activeTimestamp),
    ]);
    for (const timestamp of this.cache.keys()) {
      if (!allowed.has(timestamp)) {
        this.cache.delete(timestamp);
      }
    }
    for (const [timestamp, controller] of this.preloadControllers) {
      if (!allowed.has(timestamp)) {
        controller.abort();
        this.preloadControllers.delete(timestamp);
      }
    }
  }

  private assertUsable(): void {
    if (this.destroyed) {
      throw new Error('Cannot use a destroyed weather picker data service.');
    }
  }
}
