import {
  DEMO_TIMESTAMPS,
  type DemoTimestamp,
} from '@/features/airports';
import {
  AVIATION_LAYER_IDS,
  parseAviationScalarGrid,
  sampleAviationScalarGrid,
  type AviationLayerFrameDescriptor,
  type AviationLayerId,
  type AviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';
import {
  fetchWeatherPickerData,
  isCoordinateInsideCoverage,
  type Coordinate,
  type FetchWeatherPickerDataOptions,
  type WeatherPickerData,
} from '@/features/weather/picker';

import { buildPointForecastSeries } from './sampleBuilder';
import type {
  PointForecastDescriptorMap,
  PointForecastLoadResult,
} from './types';

interface PendingLoad<T> {
  version: number;
  promise: Promise<T>;
}

export interface LoadPointForecastCoreOptions {
  signal: AbortSignal;
  fetcher: typeof fetch;
}

export type LoadPointForecastCore = (
  timestamp: DemoTimestamp,
  options: LoadPointForecastCoreOptions,
) => Promise<WeatherPickerData>;

export interface LoadPointForecastGridOptions {
  signal: AbortSignal;
  fetcher: typeof fetch;
}

export type LoadPointForecastGrid = (
  descriptor: AviationLayerFrameDescriptor,
  options: LoadPointForecastGridOptions,
) => Promise<AviationScalarGrid>;

export interface PointForecastSeriesLoaderOptions {
  descriptorMap: PointForecastDescriptorMap;
  fetcher?: typeof fetch;
  loadCore?: LoadPointForecastCore;
  loadAviationGrid?: LoadPointForecastGrid;
}

export class PointForecastRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'PointForecastRequestError';
    this.status = status;
  }
}

export class PointForecastMinimumDataError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PointForecastMinimumDataError';
  }
}

function abortError(): DOMException {
  return new DOMException('Point forecast loading was aborted.', 'AbortError');
}

export function isPointForecastAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function defaultLoadCore(
  timestamp: DemoTimestamp,
  options: LoadPointForecastCoreOptions,
): Promise<WeatherPickerData> {
  const pickerOptions: FetchWeatherPickerDataOptions = {
    signal: options.signal,
    fetcher: options.fetcher,
  };
  return fetchWeatherPickerData(timestamp, pickerOptions);
}

async function defaultLoadAviationGrid(
  descriptor: AviationLayerFrameDescriptor,
  options: LoadPointForecastGridOptions,
): Promise<AviationScalarGrid> {
  const response = await options.fetcher(descriptor.valueDataUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });
  if (!response.ok) {
    throw new PointForecastRequestError(
      `Point forecast grid request failed with status ${response.status}.`,
      response.status,
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PointForecastRequestError(
      'Point forecast grid response is not valid JSON.',
      response.status,
    );
  }
  return parseAviationScalarGrid(payload, descriptor.layer, descriptor.timestamp);
}

const runtimeFetcher: typeof fetch = (input, init) => {
  if (typeof globalThis.fetch !== 'function') {
    throw new PointForecastRequestError(
      'Fetch is not available in the point forecast runtime.',
    );
  }
  return globalThis.fetch(input, init);
};

interface LoadedProduct {
  layer: AviationLayerId;
  grids: ReadonlyMap<DemoTimestamp, AviationScalarGrid> | null;
}

export class PointForecastSeriesLoader {
  private readonly descriptorMap: PointForecastDescriptorMap;
  private readonly fetcher: typeof fetch;
  private readonly loadCore: LoadPointForecastCore;
  private readonly loadAviationGrid: LoadPointForecastGrid;
  private readonly coreCache = new Map<DemoTimestamp, WeatherPickerData>();
  private readonly aviationCache = new Map<string, AviationScalarGrid>();
  private readonly pendingCore = new Map<DemoTimestamp, PendingLoad<WeatherPickerData>>();
  private readonly pendingAviation = new Map<string, PendingLoad<AviationScalarGrid>>();
  private activeController: AbortController | null = null;
  private requestVersion = 0;
  private destroyed = false;

  constructor(options: PointForecastSeriesLoaderOptions) {
    this.descriptorMap = options.descriptorMap;
    this.fetcher = options.fetcher ?? runtimeFetcher;
    this.loadCore = options.loadCore ?? defaultLoadCore;
    this.loadAviationGrid = options.loadAviationGrid ?? defaultLoadAviationGrid;
  }

  async loadCommittedCoordinate(coordinate: Coordinate): Promise<PointForecastLoadResult> {
    this.assertUsable();
    this.activeController?.abort();
    const version = ++this.requestVersion;
    const activeCoordinate: Coordinate = [...coordinate];
    if (!isCoordinateInsideCoverage(activeCoordinate)) {
      throw new RangeError('Coordinate is outside the frozen point forecast coverage.');
    }

    const controller = new AbortController();
    this.activeController = controller;
    const corePromise = Promise.all(DEMO_TIMESTAMPS.map(async (timestamp) => (
      [timestamp, await this.loadCoreOnce(timestamp, version, controller.signal)] as const
    )));
    const productPromises = AVIATION_LAYER_IDS.map((layer) => this.loadProduct(
      layer,
      activeCoordinate,
      version,
      controller.signal,
    ));

    try {
      const [coreEntries, ...products] = await Promise.all([
        corePromise,
        ...productPromises,
      ]);
      this.assertCurrent(version, controller.signal);
      const coreByTimestamp = new Map(coreEntries);
      const aviationByLayer = new Map<
        AviationLayerId,
        ReadonlyMap<DemoTimestamp, AviationScalarGrid>
      >();
      const unavailableMetrics: AviationLayerId[] = [];
      for (const product of products as LoadedProduct[]) {
        if (product.grids) {
          aviationByLayer.set(product.layer, product.grids);
        } else {
          unavailableMetrics.push(product.layer);
        }
      }
      const series = buildPointForecastSeries({
        coordinate: activeCoordinate,
        coreByTimestamp,
        aviationByLayer,
        unavailableMetrics,
      });
      this.assertCurrent(version, controller.signal);
      return {
        status: unavailableMetrics.length > 0 ? 'partial' : 'ready',
        series,
      };
    } catch (error) {
      if (
        controller.signal.aborted
        || version !== this.requestVersion
        || isPointForecastAbortError(error)
      ) {
        throw abortError();
      }
      controller.abort();
      throw new PointForecastMinimumDataError(
        'La serie mínima de temperatura y viento no está disponible.',
        { cause: error },
      );
    } finally {
      if (this.activeController === controller) this.activeController = null;
    }
  }

  close(): void {
    ++this.requestVersion;
    this.activeController?.abort();
    this.activeController = null;
    this.coreCache.clear();
    this.aviationCache.clear();
    this.pendingCore.clear();
    this.pendingAviation.clear();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.close();
    this.destroyed = true;
  }

  private async loadProduct(
    layer: AviationLayerId,
    coordinate: Coordinate,
    version: number,
    signal: AbortSignal,
  ): Promise<LoadedProduct> {
    try {
      const entries = await Promise.all(DEMO_TIMESTAMPS.map(async (timestamp) => {
        const grid = await this.loadAviationGridOnce(layer, timestamp, version, signal);
        sampleAviationScalarGrid(grid, coordinate);
        return [timestamp, grid] as const;
      }));
      return { layer, grids: new Map(entries) };
    } catch (error) {
      if (isPointForecastAbortError(error) || signal.aborted) throw abortError();
      return { layer, grids: null };
    }
  }

  private loadCoreOnce(
    timestamp: DemoTimestamp,
    version: number,
    signal: AbortSignal,
  ): Promise<WeatherPickerData> {
    const cached = this.coreCache.get(timestamp);
    if (cached) return Promise.resolve(cached);
    const pending = this.pendingCore.get(timestamp);
    if (pending?.version === version) return pending.promise;

    const promise = this.loadCore(timestamp, { signal, fetcher: this.fetcher })
      .then((data) => {
        this.assertCurrent(version, signal);
        if (data.timestamp !== timestamp) {
          throw new TypeError(`Core timestamp mismatch for ${timestamp}.`);
        }
        this.coreCache.set(timestamp, data);
        return data;
      })
      .finally(() => {
        if (this.pendingCore.get(timestamp)?.promise === promise) {
          this.pendingCore.delete(timestamp);
        }
      });
    this.pendingCore.set(timestamp, { version, promise });
    return promise;
  }

  private loadAviationGridOnce(
    layer: AviationLayerId,
    timestamp: DemoTimestamp,
    version: number,
    signal: AbortSignal,
  ): Promise<AviationScalarGrid> {
    const key = `${layer}/${timestamp}`;
    const cached = this.aviationCache.get(key);
    if (cached) return Promise.resolve(cached);
    const pending = this.pendingAviation.get(key);
    if (pending?.version === version) return pending.promise;
    const descriptor = this.descriptorMap[timestamp][layer];

    const promise = this.loadAviationGrid(descriptor, { signal, fetcher: this.fetcher })
      .then((grid) => {
        this.assertCurrent(version, signal);
        if (
          grid.layer !== layer
          || grid.timestamp !== timestamp
          || grid.is_simulated !== true
          || grid.operational_use !== false
        ) {
          throw new TypeError(`Grid metadata mismatch for ${key}.`);
        }
        this.aviationCache.set(key, grid);
        return grid;
      })
      .finally(() => {
        if (this.pendingAviation.get(key)?.promise === promise) {
          this.pendingAviation.delete(key);
        }
      });
    this.pendingAviation.set(key, { version, promise });
    return promise;
  }

  private assertCurrent(version: number, signal: AbortSignal): void {
    if (this.destroyed || signal.aborted || version !== this.requestVersion) {
      throw abortError();
    }
  }

  private assertUsable(): void {
    if (this.destroyed) {
      throw new Error('Cannot use a destroyed point forecast series loader.');
    }
  }
}
