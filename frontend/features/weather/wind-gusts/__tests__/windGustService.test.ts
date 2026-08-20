import {
  createAviationScalarGridFixture,
} from '@/features/weather/aviation-layer-contracts';
import {
  WIND_GUST_FRAME_DESCRIPTORS,
  WindGustGridLoadError,
  WindGustLayerService,
  WindGustRasterLoadError,
} from '@/features/weather/wind-gusts';

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
    .mockImplementation((_blob: Blob) => `blob:gust-${createObjectURL.mock.calls.length}`);
  const revokeObjectURL = jest.fn();
  const fetcher = options.fetcher ?? jest.fn(async (url: string) => {
    const descriptor = WIND_GUST_FRAME_DESCRIPTORS.find(
      ({ imageUrl, valueDataUrl }) => url === imageUrl || url === valueDataUrl,
    );
    if (!descriptor) return responseDouble({ ok: false, status: 404 });
    if (url === descriptor.imageUrl) return responseDouble();
    return responseDouble({
      json: jest.fn(async () => createAviationScalarGridFixture(
        'wind-gusts',
        descriptor.timestamp,
        { value: 24.6 },
      )),
    });
  });
  const service = new WindGustLayerService({
    maxCachedFrames: options.maxCachedFrames,
    fetcher: fetcher as typeof fetch,
    imageFactory: options.imageFactory ?? (() => imageDouble()),
    createObjectURL,
    revokeObjectURL,
  });
  return { service, fetcher, createObjectURL, revokeObjectURL };
}

describe('WindGustLayerService', () => {
  it('loads a staged scalar raster and grid with exact request contracts', async () => {
    const { service, fetcher, revokeObjectURL } = serviceHarness();
    const descriptor = WIND_GUST_FRAME_DESCRIPTORS[2];

    const frame = await service.load(descriptor);

    expect(frame).toMatchObject({ descriptor, gridError: null });
    expect(frame.grid?.values[0]).toBe(24.6);
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

  it('keeps a valid raster when only the grid fails', async () => {
    const descriptor = WIND_GUST_FRAME_DESCRIPTORS[2];
    const fetcher = jest.fn(async (url: string) => (
      url === descriptor.imageUrl
        ? responseDouble()
        : responseDouble({ ok: false, status: 503 })
    ));
    const { service } = serviceHarness({ fetcher });

    const frame = await service.load(descriptor);

    expect(frame.image.src).toBe(frame.objectUrl);
    expect(frame.grid).toBeNull();
    expect(frame.gridError).toBeInstanceOf(WindGustGridLoadError);
    service.destroy();
  });

  it('rejects HTTP and non-WebP raster failures before caching', async () => {
    const descriptor = WIND_GUST_FRAME_DESCRIPTORS[2];
    const failed = jest.fn(async (url: string) => (
      url === descriptor.imageUrl
        ? responseDouble({ ok: false, status: 503 })
        : responseDouble({
          json: jest.fn(async () => createAviationScalarGridFixture(
            'wind-gusts',
            descriptor.timestamp,
          )),
        })
    ));
    const first = serviceHarness({ fetcher: failed });
    await expect(first.service.load(descriptor)).rejects.toBeInstanceOf(
      WindGustRasterLoadError,
    );
    first.service.destroy();

    const invalidType = jest.fn(async (url: string) => (
      url === descriptor.imageUrl
        ? responseDouble({
          blob: jest.fn(async () => new Blob(['png'], { type: 'image/png' })),
        })
        : responseDouble({
          json: jest.fn(async () => createAviationScalarGridFixture(
            'wind-gusts',
            descriptor.timestamp,
          )),
        })
    ));
    const second = serviceHarness({ fetcher: invalidType });
    await expect(second.service.load(descriptor)).rejects.toBeInstanceOf(
      WindGustRasterLoadError,
    );
    expect(second.service.getCached(descriptor.timestamp)).toBeNull();
    second.service.destroy();
  });

  it('retries a missing grid while reusing the cached raster', async () => {
    const descriptor = WIND_GUST_FRAME_DESCRIPTORS[2];
    let gridRequests = 0;
    const fetcher = jest.fn(async (url: string) => {
      if (url === descriptor.imageUrl) return responseDouble();
      gridRequests += 1;
      if (gridRequests === 1) return responseDouble({ ok: false, status: 503 });
      return responseDouble({
        json: jest.fn(async () => createAviationScalarGridFixture(
          'wind-gusts',
          descriptor.timestamp,
          { value: 30 },
        )),
      });
    });
    const { service, createObjectURL } = serviceHarness({ fetcher });
    const partial = await service.load(descriptor);
    const complete = await service.load(descriptor);

    expect(partial.grid).toBeNull();
    expect(complete.grid?.values[0]).toBe(30);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(3);
    service.destroy();
  });

  it('revokes object URLs on LRU eviction and idempotent destroy', async () => {
    const { service, revokeObjectURL } = serviceHarness({ maxCachedFrames: 1 });
    const first = await service.load(WIND_GUST_FRAME_DESCRIPTORS[2]);
    const second = await service.load(WIND_GUST_FRAME_DESCRIPTORS[3]);

    expect(revokeObjectURL).toHaveBeenCalledWith(first.objectUrl);
    service.destroy();
    service.destroy();
    expect(revokeObjectURL).toHaveBeenCalledWith(second.objectUrl);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('aborts pending work without turning abort into a layer error', async () => {
    const controller = new AbortController();
    const { service, revokeObjectURL } = serviceHarness({
      imageFactory: () => imageDouble('pending'),
    });
    const descriptor = WIND_GUST_FRAME_DESCRIPTORS[2];
    const loading = service.load(descriptor, { signal: controller.signal });
    await Promise.resolve();
    controller.abort();

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    expect(service.getCached(descriptor.timestamp)).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    service.destroy();
  });

  it('discards a late 09Z response after 12Z wins the request race', async () => {
    const staleDescriptor = WIND_GUST_FRAME_DESCRIPTORS[3];
    const latestDescriptor = WIND_GUST_FRAME_DESCRIPTORS[4];
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
          'wind-gusts',
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

  it('aborts active requests and clears all cache entries on destroy', async () => {
    const { service, revokeObjectURL } = serviceHarness({ maxCachedFrames: 2 });
    const frame = await service.load(WIND_GUST_FRAME_DESCRIPTORS[2]);
    service.destroy();

    expect(revokeObjectURL).toHaveBeenCalledWith(frame.objectUrl);
    expect(() => service.getCached(frame.descriptor.timestamp)).not.toThrow();
    await expect(service.load(frame.descriptor)).rejects.toThrow(
      'Cannot use a destroyed wind-gust layer service.',
    );
  });
});
