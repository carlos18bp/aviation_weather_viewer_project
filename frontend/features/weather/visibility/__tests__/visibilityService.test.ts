import {
  createAviationScalarGridFixture,
} from '@/features/weather/aviation-layer-contracts';
import {
  VISIBILITY_FRAME_DESCRIPTORS,
  VisibilityGridLoadError,
  VisibilityLayerService,
  VisibilityRasterLoadError,
} from '@/features/weather/visibility';

function responseDouble(overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    blob: jest.fn(async () => new Blob(['webp'], { type: 'image/webp' })),
    json: jest.fn(async () => ({})),
    ...overrides,
  } as unknown as Response;
}

function imageDouble(outcome: 'load' | 'error' | 'pending' = 'load'): HTMLImageElement {
  const image = new EventTarget() as HTMLImageElement;
  let source = '';
  Object.defineProperty(image, 'src', {
    configurable: true,
    get: () => source,
    set: (value: string) => {
      source = value;
      if (outcome !== 'pending') queueMicrotask(() => image.dispatchEvent(new Event(outcome)));
    },
  });
  image.removeAttribute = jest.fn(() => { source = ''; });
  return image;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function serviceHarness(options: {
  maxCachedFrames?: 1 | 2 | 3;
  fetcher?: jest.Mock;
  imageFactory?: () => HTMLImageElement;
} = {}) {
  const createObjectURL = jest.fn()
    .mockImplementation((_blob: Blob) => `blob:visibility-${createObjectURL.mock.calls.length}`);
  const revokeObjectURL = jest.fn();
  const fetcher = options.fetcher ?? jest.fn(async (url: string) => {
    const descriptor = VISIBILITY_FRAME_DESCRIPTORS.find(
      ({ imageUrl, valueDataUrl }) => url === imageUrl || url === valueDataUrl,
    );
    if (!descriptor) return responseDouble({ ok: false, status: 404 });
    if (url === descriptor.imageUrl) return responseDouble();
    return responseDouble({
      json: jest.fn(async () => createAviationScalarGridFixture(
        'visibility',
        descriptor.timestamp,
        { value: 8.4 },
      )),
    });
  });
  const service = new VisibilityLayerService({
    maxCachedFrames: options.maxCachedFrames,
    fetcher: fetcher as typeof fetch,
    imageFactory: options.imageFactory ?? (() => imageDouble()),
    createObjectURL,
    revokeObjectURL,
  });
  return { service, fetcher, createObjectURL, revokeObjectURL };
}

describe('VisibilityLayerService', () => {
  it('loads a staged raster and grid with same-origin request contracts', async () => {
    const { service, fetcher, revokeObjectURL } = serviceHarness();
    const descriptor = VISIBILITY_FRAME_DESCRIPTORS[2];

    const frame = await service.load(descriptor);

    expect(frame).toMatchObject({ descriptor, gridError: null });
    expect(frame.grid?.values[0]).toBe(8.4);
    expect(fetcher).toHaveBeenCalledWith(
      descriptor.imageUrl,
      expect.objectContaining({ method: 'GET', headers: { Accept: 'image/webp' } }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      descriptor.valueDataUrl,
      expect.objectContaining({ method: 'GET', headers: { Accept: 'application/json' } }),
    );
    expect(revokeObjectURL).not.toHaveBeenCalled();
    service.destroy();
    expect(revokeObjectURL).toHaveBeenCalledWith(frame.objectUrl);
  });

  it('keeps a valid raster when only the grid request fails', async () => {
    const descriptor = VISIBILITY_FRAME_DESCRIPTORS[2];
    const fetcher = jest.fn(async (url: string) => (
      url === descriptor.imageUrl
        ? responseDouble()
        : responseDouble({ ok: false, status: 503 })
    ));
    const { service } = serviceHarness({ fetcher });

    const frame = await service.load(descriptor);

    expect(frame.image.src).toBe(frame.objectUrl);
    expect(frame.grid).toBeNull();
    expect(frame.gridError).toBeInstanceOf(VisibilityGridLoadError);
    service.destroy();
  });

  it('keeps a valid raster when the grid JSON is corrupt', async () => {
    const descriptor = VISIBILITY_FRAME_DESCRIPTORS[2];
    const fetcher = jest.fn(async (url: string) => (
      url === descriptor.imageUrl
        ? responseDouble()
        : responseDouble({ json: jest.fn(async () => { throw new Error('bad JSON'); }) })
    ));
    const { service } = serviceHarness({ fetcher });

    const frame = await service.load(descriptor);

    expect(frame.grid).toBeNull();
    expect(frame.gridError).toBeInstanceOf(VisibilityGridLoadError);
    service.destroy();
  });

  it('rejects a failed raster so the caller can retain its confirmed frame', async () => {
    const descriptor = VISIBILITY_FRAME_DESCRIPTORS[2];
    const fetcher = jest.fn(async (url: string) => (
      url === descriptor.imageUrl
        ? responseDouble({ ok: false, status: 503 })
        : responseDouble({
          json: jest.fn(async () => createAviationScalarGridFixture(
            'visibility',
            descriptor.timestamp,
          )),
        })
    ));
    const { service } = serviceHarness({ fetcher });

    await expect(service.load(descriptor)).rejects.toBeInstanceOf(
      VisibilityRasterLoadError,
    );
    expect(service.getCached(descriptor.timestamp)).toBeNull();
    service.destroy();
  });

  it('reuses complete cached frames without another fetch', async () => {
    const { service, fetcher } = serviceHarness({ maxCachedFrames: 2 });
    const descriptor = VISIBILITY_FRAME_DESCRIPTORS[2];
    const first = await service.load(descriptor);

    await expect(service.load(descriptor)).resolves.toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(2);
    service.destroy();
  });

  it('revokes object URLs on LRU eviction and idempotent destroy', async () => {
    const { service, revokeObjectURL } = serviceHarness({ maxCachedFrames: 1 });
    const first = await service.load(VISIBILITY_FRAME_DESCRIPTORS[2]);
    const second = await service.load(VISIBILITY_FRAME_DESCRIPTORS[3]);

    expect(revokeObjectURL).toHaveBeenCalledWith(first.objectUrl);
    expect(service.getCached(first.descriptor.timestamp)).toBeNull();
    service.destroy();
    service.destroy();
    expect(revokeObjectURL).toHaveBeenCalledWith(second.objectUrl);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('aborts an external pending image load without publishing a cache entry', async () => {
    const controller = new AbortController();
    const { service, revokeObjectURL } = serviceHarness({
      imageFactory: () => imageDouble('pending'),
    });
    const descriptor = VISIBILITY_FRAME_DESCRIPTORS[2];
    const loading = service.load(descriptor, { signal: controller.signal });
    await Promise.resolve();
    controller.abort();

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    expect(service.getCached(descriptor.timestamp)).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    service.destroy();
  });

  it('discards and revokes a late response after a newer timestamp wins', async () => {
    const staleDescriptor = VISIBILITY_FRAME_DESCRIPTORS[2];
    const latestDescriptor = VISIBILITY_FRAME_DESCRIPTORS[3];
    const staleRaster = deferred<Response>();
    const fetcher = jest.fn(async (url: string) => {
      if (url === staleDescriptor.imageUrl) return staleRaster.promise;
      const descriptor = [staleDescriptor, latestDescriptor].find(
        ({ imageUrl, valueDataUrl }) => url === imageUrl || url === valueDataUrl,
      );
      if (!descriptor) return responseDouble({ ok: false, status: 404 });
      if (url === descriptor.imageUrl) return responseDouble();
      return responseDouble({
        json: jest.fn(async () => createAviationScalarGridFixture(
          'visibility',
          descriptor.timestamp,
        )),
      });
    });
    const { service, revokeObjectURL } = serviceHarness({
      maxCachedFrames: 2,
      fetcher,
    });
    const stale = service.load(staleDescriptor);
    const latest = await service.load(latestDescriptor);
    staleRaster.resolve(responseDouble());

    await expect(stale).rejects.toMatchObject({ name: 'AbortError' });
    expect(service.getCached(latestDescriptor.timestamp)).toBe(latest);
    expect(service.getCached(staleDescriptor.timestamp)).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    service.destroy();
  });
});
