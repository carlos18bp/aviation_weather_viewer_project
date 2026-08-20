import { parseDemoTimestamp, type DemoTimestamp } from '@/features/airports';
import type {
  AviationLayerFrameDescriptor,
  AviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';

import type {
  AviationRasterFrame,
  CloudFrameCachePolicy,
  CloudLayerFrameService,
} from './types';

export interface CloudLayerServiceDependencies {
  fetcher?: typeof fetch;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

interface CloudLayerServiceOptions<
  TDescriptor extends AviationLayerFrameDescriptor,
  TGrid extends AviationScalarGrid,
> extends CloudLayerServiceDependencies {
  cachePolicy: CloudFrameCachePolicy;
  parseDescriptor(value: unknown): TDescriptor;
  parseGrid(value: unknown, timestamp: DemoTimestamp): TGrid;
}

export class CloudLayerRasterRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 0, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CloudLayerRasterRequestError';
    this.status = status;
  }
}

export class CloudLayerValueRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 0, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CloudLayerValueRequestError';
    this.status = status;
  }
}

function abortError(): DOMException {
  return new DOMException('Cloud layer loading was aborted.', 'AbortError');
}

export function isCloudLayerAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function linkAbortSignal(signal: AbortSignal, controller: AbortController): () => void {
  const handleAbort = () => controller.abort();
  if (signal.aborted) {
    controller.abort();
  } else {
    signal.addEventListener('abort', handleAbort, { once: true });
  }
  return () => signal.removeEventListener('abort', handleAbort);
}

function normalizeRasterError(error: unknown): Error {
  if (isCloudLayerAbortError(error)) return error as Error;
  if (error instanceof CloudLayerRasterRequestError) return error;
  return new CloudLayerRasterRequestError(
    'No fue posible preparar el raster simulado de nubes.',
    0,
    { cause: error },
  );
}

function normalizeValueError(error: unknown): CloudLayerValueRequestError {
  if (error instanceof CloudLayerValueRequestError) return error;
  return new CloudLayerValueRequestError(
    'Los valores simulados de la capa no están disponibles.',
    0,
    { cause: error },
  );
}

export class BoundedCloudLayerFrameService<
  TDescriptor extends AviationLayerFrameDescriptor,
  TGrid extends AviationScalarGrid,
> implements CloudLayerFrameService<AviationRasterFrame<TDescriptor, TGrid>> {
  private readonly cache = new Map<DemoTimestamp, AviationRasterFrame<TDescriptor, TGrid>>();
  private readonly fetcher: typeof fetch;
  private readonly createObjectURL: (blob: Blob) => string;
  private readonly revokeObjectURL: (url: string) => void;
  private readonly cachePolicy: CloudFrameCachePolicy;
  private readonly parseDescriptor: (value: unknown) => TDescriptor;
  private readonly parseGrid: (value: unknown, timestamp: DemoTimestamp) => TGrid;
  private activeController: AbortController | null = null;
  private activeTimestamp: DemoTimestamp | null = null;
  private requestVersion = 0;
  private destroyed = false;

  constructor(options: CloudLayerServiceOptions<TDescriptor, TGrid>) {
    if (![1, 2, 3].includes(options.cachePolicy.maxEntries)) {
      throw new RangeError('Cloud layer cache supports one, two, or three entries.');
    }
    this.fetcher = options.fetcher ?? fetch;
    this.createObjectURL = options.createObjectURL ?? URL.createObjectURL.bind(URL);
    this.revokeObjectURL = options.revokeObjectURL ?? URL.revokeObjectURL.bind(URL);
    this.cachePolicy = options.cachePolicy;
    this.parseDescriptor = options.parseDescriptor;
    this.parseGrid = options.parseGrid;
  }

  get size(): number {
    return this.cache.size;
  }

  async load(
    descriptorValue: unknown,
    signal: AbortSignal,
  ): Promise<AviationRasterFrame<TDescriptor, TGrid>> {
    this.assertUsable();
    const descriptor = this.parseDescriptor(descriptorValue);
    if (signal.aborted) throw abortError();

    const requestVersion = ++this.requestVersion;
    this.activeTimestamp = descriptor.timestamp;
    this.activeController?.abort();
    this.activeController = null;

    const cached = this.cache.get(descriptor.timestamp);
    if (cached) {
      this.touch(descriptor.timestamp, cached);
      return cached;
    }

    const controller = new AbortController();
    this.activeController = controller;
    const unlinkAbort = linkAbortSignal(signal, controller);

    try {
      const frame = await this.fetchFrame(descriptor, controller.signal);
      if (
        this.destroyed
        || controller.signal.aborted
        || requestVersion !== this.requestVersion
        || descriptor.timestamp !== this.activeTimestamp
      ) {
        this.revokeObjectURL(frame.objectUrl);
        throw abortError();
      }
      this.store(frame);
      return frame;
    } catch (error) {
      if (controller.signal.aborted || isCloudLayerAbortError(error)) {
        throw abortError();
      }
      throw error;
    } finally {
      unlinkAbort();
      if (this.activeController === controller) this.activeController = null;
    }
  }

  retain(timestamps: readonly DemoTimestamp[]): void {
    if (this.destroyed) return;
    const retained = new Set(timestamps.slice(0, this.cachePolicy.maxEntries));
    for (const [timestamp, frame] of this.cache) {
      if (!retained.has(timestamp)) {
        this.revokeObjectURL(frame.objectUrl);
        this.cache.delete(timestamp);
      }
    }
    if (this.activeTimestamp && !retained.has(this.activeTimestamp)) {
      ++this.requestVersion;
      this.activeController?.abort();
      this.activeController = null;
      this.activeTimestamp = null;
    }
  }

  getCached(timestampValue: string): AviationRasterFrame<TDescriptor, TGrid> | null {
    const timestamp = parseDemoTimestamp(timestampValue);
    const cached = this.cache.get(timestamp) ?? null;
    if (cached) this.touch(timestamp, cached);
    return cached;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    ++this.requestVersion;
    this.activeController?.abort();
    this.activeController = null;
    this.activeTimestamp = null;
    for (const frame of this.cache.values()) {
      this.revokeObjectURL(frame.objectUrl);
    }
    this.cache.clear();
  }

  private async fetchFrame(
    descriptor: TDescriptor,
    signal: AbortSignal,
  ): Promise<AviationRasterFrame<TDescriptor, TGrid>> {
    const [rasterResult, valueResult] = await Promise.allSettled([
      this.fetchRaster(descriptor.imageUrl, signal),
      this.fetchGrid(descriptor, signal),
    ]);

    if (signal.aborted) {
      if (rasterResult.status === 'fulfilled') {
        this.revokeObjectURL(rasterResult.value);
      }
      throw abortError();
    }
    if (rasterResult.status === 'rejected') {
      throw normalizeRasterError(rasterResult.reason);
    }
    return {
      descriptor,
      objectUrl: rasterResult.value,
      valueGrid: valueResult.status === 'fulfilled' ? valueResult.value : null,
      valueError: valueResult.status === 'rejected'
        ? normalizeValueError(valueResult.reason)
        : null,
    };
  }

  private async fetchRaster(url: string, signal: AbortSignal): Promise<string> {
    const response = await this.fetcher(url, {
      method: 'GET',
      headers: { Accept: 'image/webp' },
      signal,
    });
    if (!response.ok) {
      throw new CloudLayerRasterRequestError(
        `Cloud raster request failed with status ${response.status}.`,
        response.status,
      );
    }
    const blob = await response.blob();
    if (blob.type && blob.type !== 'image/webp') {
      throw new CloudLayerRasterRequestError('Cloud raster response is not WebP.');
    }
    return this.createObjectURL(blob);
  }

  private async fetchGrid(descriptor: TDescriptor, signal: AbortSignal): Promise<TGrid> {
    const response = await this.fetcher(descriptor.valueDataUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) {
      throw new CloudLayerValueRequestError(
        `Cloud value request failed with status ${response.status}.`,
        response.status,
      );
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new CloudLayerValueRequestError(
        'Cloud value response is not valid JSON.',
        response.status,
        { cause: error },
      );
    }
    return this.parseGrid(payload, descriptor.timestamp);
  }

  private store(frame: AviationRasterFrame<TDescriptor, TGrid>): void {
    const timestamp = frame.descriptor.timestamp;
    const existing = this.cache.get(timestamp);
    if (existing && existing.objectUrl !== frame.objectUrl) {
      this.revokeObjectURL(existing.objectUrl);
    }
    this.cache.delete(timestamp);
    this.cache.set(timestamp, frame);
    while (this.cache.size > this.cachePolicy.maxEntries) {
      const oldestTimestamp = this.cache.keys().next().value as DemoTimestamp | undefined;
      if (!oldestTimestamp) break;
      const oldest = this.cache.get(oldestTimestamp);
      if (oldest) this.revokeObjectURL(oldest.objectUrl);
      this.cache.delete(oldestTimestamp);
    }
  }

  private touch(
    timestamp: DemoTimestamp,
    frame: AviationRasterFrame<TDescriptor, TGrid>,
  ): void {
    this.cache.delete(timestamp);
    this.cache.set(timestamp, frame);
  }

  private assertUsable(): void {
    if (this.destroyed) {
      throw new Error('Cannot use a destroyed cloud layer service.');
    }
  }
}
