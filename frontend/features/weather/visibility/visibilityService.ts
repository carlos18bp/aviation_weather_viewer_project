import { parseDemoTimestamp, type DemoTimestamp } from '@/features/airports';

import { parseVisibilityFrameDescriptor, parseVisibilityGrid } from './visibilitySchema';
import type {
  VisibilityFrameDescriptor,
  VisibilityGrid,
  VisibilityLoadedFrame,
} from './types';

export type VisibilityCacheSize = 1 | 2 | 3;

export interface VisibilityLayerServiceOptions {
  maxCachedFrames?: VisibilityCacheSize;
  fetcher?: typeof fetch;
  imageFactory?: () => HTMLImageElement;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

export interface LoadVisibilityFrameOptions {
  signal?: AbortSignal;
}

export class VisibilityRasterLoadError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'VisibilityRasterLoadError';
    this.status = status;
  }
}

export class VisibilityGridLoadError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'VisibilityGridLoadError';
    this.status = status;
  }
}

function abortError(): DOMException {
  return new DOMException('Visibility frame loading was aborted.', 'AbortError');
}

export function isVisibilityAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
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

function waitForImage(
  image: HTMLImageElement,
  objectUrl: string,
  signal: AbortSignal,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
      signal.removeEventListener('abort', handleAbort);
    };
    const settle = (operation: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      operation();
    };
    const handleLoad = () => settle(() => resolve(image));
    const handleError = () => settle(() => {
      image.removeAttribute('src');
      reject(new VisibilityRasterLoadError('Visibility WebP could not be decoded.'));
    });
    const handleAbort = () => settle(() => {
      image.removeAttribute('src');
      reject(abortError());
    });
    image.addEventListener('load', handleLoad, { once: true });
    image.addEventListener('error', handleError, { once: true });
    signal.addEventListener('abort', handleAbort, { once: true });
    if (signal.aborted) {
      handleAbort();
      return;
    }
    image.src = objectUrl;
  });
}

export class VisibilityLayerService {
  private readonly maxCachedFrames: VisibilityCacheSize;
  private readonly fetcher: typeof fetch;
  private readonly imageFactory: () => HTMLImageElement;
  private readonly createObjectURL: (blob: Blob) => string;
  private readonly revokeObjectURL: (url: string) => void;
  private readonly cache = new Map<DemoTimestamp, VisibilityLoadedFrame>();
  private activeController: AbortController | null = null;
  private requestVersion = 0;
  private destroyed = false;

  constructor(options: VisibilityLayerServiceOptions = {}) {
    this.maxCachedFrames = options.maxCachedFrames ?? 1;
    if (![1, 2, 3].includes(this.maxCachedFrames)) {
      throw new RangeError('Visibility cache size must be 1, 2, or 3.');
    }
    this.fetcher = options.fetcher ?? fetch;
    this.imageFactory = options.imageFactory ?? (() => new Image());
    this.createObjectURL = options.createObjectURL ?? URL.createObjectURL.bind(URL);
    this.revokeObjectURL = options.revokeObjectURL ?? URL.revokeObjectURL.bind(URL);
  }

  async load(
    value: unknown,
    options: LoadVisibilityFrameOptions = {},
  ): Promise<VisibilityLoadedFrame> {
    this.assertUsable();
    const descriptor = parseVisibilityFrameDescriptor(value);
    const requestVersion = ++this.requestVersion;
    this.cancelActiveRequest();
    if (options.signal?.aborted) throw abortError();

    const cached = this.touch(descriptor.timestamp);
    if (cached?.grid) return cached;

    const controller = new AbortController();
    this.activeController = controller;
    const unlinkAbort = linkAbortSignal(options.signal, controller);
    try {
      if (cached) {
        return await this.completeCachedGrid(
          cached,
          descriptor,
          controller,
          requestVersion,
        );
      }
      return await this.loadFresh(descriptor, controller, requestVersion);
    } finally {
      unlinkAbort();
      if (this.activeController === controller) this.activeController = null;
    }
  }

  getCached(timestamp: string): VisibilityLoadedFrame | null {
    const parsedTimestamp = parseDemoTimestamp(timestamp);
    return this.touch(parsedTimestamp);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    ++this.requestVersion;
    this.cancelActiveRequest();
    for (const frame of this.cache.values()) this.releaseFrame(frame);
    this.cache.clear();
  }

  private async loadFresh(
    descriptor: VisibilityFrameDescriptor,
    controller: AbortController,
    requestVersion: number,
  ): Promise<VisibilityLoadedFrame> {
    const [rasterResult, gridResult] = await Promise.allSettled([
      this.fetchRaster(descriptor, controller.signal),
      this.fetchGrid(descriptor, controller.signal),
    ]);
    if (
      controller.signal.aborted
      || this.destroyed
      || requestVersion !== this.requestVersion
    ) {
      if (rasterResult.status === 'fulfilled') this.releaseFrame(rasterResult.value);
      throw abortError();
    }
    if (rasterResult.status === 'rejected') {
      if (isVisibilityAbortError(rasterResult.reason)) throw abortError();
      throw normalizeError(rasterResult.reason);
    }
    if (gridResult.status === 'rejected' && isVisibilityAbortError(gridResult.reason)) {
      this.releaseFrame(rasterResult.value);
      throw abortError();
    }
    const frame: VisibilityLoadedFrame = {
      ...rasterResult.value,
      grid: gridResult.status === 'fulfilled' ? gridResult.value : null,
      gridError: gridResult.status === 'rejected'
        ? normalizeError(gridResult.reason)
        : null,
    };
    this.cacheFrame(frame);
    return frame;
  }

  private async completeCachedGrid(
    cached: VisibilityLoadedFrame,
    descriptor: VisibilityFrameDescriptor,
    controller: AbortController,
    requestVersion: number,
  ): Promise<VisibilityLoadedFrame> {
    let grid: VisibilityGrid;
    try {
      grid = await this.fetchGrid(descriptor, controller.signal);
    } catch (error) {
      if (
        controller.signal.aborted
        || this.destroyed
        || requestVersion !== this.requestVersion
        || isVisibilityAbortError(error)
      ) {
        throw abortError();
      }
      const partial = { ...cached, gridError: normalizeError(error) };
      this.cache.set(descriptor.timestamp, partial);
      return partial;
    }
    if (
      controller.signal.aborted
      || this.destroyed
      || requestVersion !== this.requestVersion
    ) {
      throw abortError();
    }
    const complete = { ...cached, grid, gridError: null };
    this.cache.set(descriptor.timestamp, complete);
    return complete;
  }

  private async fetchRaster(
    descriptor: VisibilityFrameDescriptor,
    signal: AbortSignal,
  ): Promise<VisibilityLoadedFrame> {
    const response = await this.fetcher(descriptor.imageUrl, {
      method: 'GET',
      signal,
      headers: { Accept: 'image/webp' },
    });
    if (!response.ok) {
      throw new VisibilityRasterLoadError(
        `Visibility WebP request failed with status ${response.status}.`,
        response.status,
      );
    }
    const blob = await response.blob();
    if (blob.type && blob.type !== 'image/webp') {
      throw new VisibilityRasterLoadError('Visibility raster response is not WebP.');
    }
    const objectUrl = this.createObjectURL(blob);
    try {
      const image = await waitForImage(this.imageFactory(), objectUrl, signal);
      return { descriptor, image, objectUrl, grid: null, gridError: null };
    } catch (error) {
      this.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  private async fetchGrid(
    descriptor: VisibilityFrameDescriptor,
    signal: AbortSignal,
  ): Promise<VisibilityGrid> {
    const response = await this.fetcher(descriptor.valueDataUrl, {
      method: 'GET',
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new VisibilityGridLoadError(
        `Visibility grid request failed with status ${response.status}.`,
        response.status,
      );
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new VisibilityGridLoadError('Visibility grid response is not valid JSON.');
    }
    return parseVisibilityGrid(payload, descriptor.timestamp);
  }

  private cacheFrame(frame: VisibilityLoadedFrame): void {
    const timestamp = frame.descriptor.timestamp;
    const previous = this.cache.get(timestamp);
    if (previous && previous !== frame) this.releaseFrame(previous);
    this.cache.delete(timestamp);
    this.cache.set(timestamp, frame);
    while (this.cache.size > this.maxCachedFrames) {
      const oldestTimestamp = this.cache.keys().next().value as DemoTimestamp | undefined;
      if (!oldestTimestamp) break;
      const oldest = this.cache.get(oldestTimestamp);
      this.cache.delete(oldestTimestamp);
      if (oldest) this.releaseFrame(oldest);
    }
  }

  private touch(timestamp: DemoTimestamp): VisibilityLoadedFrame | null {
    const frame = this.cache.get(timestamp);
    if (!frame) return null;
    this.cache.delete(timestamp);
    this.cache.set(timestamp, frame);
    return frame;
  }

  private releaseFrame(frame: VisibilityLoadedFrame): void {
    frame.image.removeAttribute('src');
    this.revokeObjectURL(frame.objectUrl);
  }

  private cancelActiveRequest(): void {
    this.activeController?.abort();
    this.activeController = null;
  }

  private assertUsable(): void {
    if (this.destroyed) {
      throw new Error('Cannot use a destroyed visibility layer service.');
    }
  }
}

export function createVisibilityLayerService(
  options: VisibilityLayerServiceOptions = {},
): VisibilityLayerService {
  return new VisibilityLayerService(options);
}
