import {
  createAviationScalarGridFixture,
} from '@/features/weather/aviation-layer-contracts';
import {
  CLOUD_BASE_FRAME_DESCRIPTORS,
  createCloudBaseFrameService,
} from '@/features/weather/cloud-base';
import {
  CLOUD_COVER_FRAME_DESCRIPTORS,
  CloudLayerRasterRequestError,
  CloudLayerValueRequestError,
  CloudLayerValidationError,
  createCloudCoverFrameService,
  isCloudLayerAbortError,
} from '@/features/weather/cloud-cover';

function rasterResponse(status = 200, type = 'image/webp'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    blob: jest.fn(async () => new Blob(['webp'], { type })),
  } as unknown as Response;
}

function gridResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => payload),
  } as unknown as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function coverFetcher(): jest.MockedFunction<typeof fetch> {
  return jest.fn(async (input) => {
    const url = String(input);
    if (url.endsWith('.webp')) return rasterResponse();
    const descriptor = CLOUD_COVER_FRAME_DESCRIPTORS.find(
      ({ valueDataUrl }) => valueDataUrl === url,
    );
    if (!descriptor) throw new Error(`Unexpected request: ${url}`);
    return gridResponse(createAviationScalarGridFixture(
      'cloud-cover',
      descriptor.timestamp,
      { value: 50 },
    ));
  });
}

describe('cloud layer frame services', () => {
  it('loads image and grid together using only the staged same-origin paths', async () => {
    const fetcher = coverFetcher();
    const createObjectURL = jest.fn(() => 'blob:cloud-cover-06Z');
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 2 },
      fetcher,
      createObjectURL,
      revokeObjectURL: jest.fn(),
    });
    const descriptor = CLOUD_COVER_FRAME_DESCRIPTORS[2];

    const frame = await service.load(descriptor, new AbortController().signal);

    expect(frame).toMatchObject({
      descriptor,
      objectUrl: 'blob:cloud-cover-06Z',
      valueError: null,
      valueGrid: { layer: 'cloud-cover', timestamp: descriptor.timestamp },
    });
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      descriptor.imageUrl,
      descriptor.valueDataUrl,
    ]);
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith('/media/')))
      .toBe(true);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('loads a cloud-base grid with valid null cells', async () => {
    const descriptor = CLOUD_BASE_FRAME_DESCRIPTORS[2];
    const fetcher = jest.fn(async (input) => (
      String(input).endsWith('.webp')
        ? rasterResponse()
        : gridResponse(createAviationScalarGridFixture(
          'cloud-base',
          descriptor.timestamp,
          { nullIndexes: [0] },
        ))
    ));
    const service = createCloudBaseFrameService({
      cachePolicy: { maxEntries: 1 },
      fetcher: fetcher as typeof fetch,
      createObjectURL: () => 'blob:cloud-base-06Z',
      revokeObjectURL: jest.fn(),
    });

    const frame = await service.load(descriptor, new AbortController().signal);
    expect(frame.valueGrid?.values[0]).toBeNull();
    expect(frame.valueError).toBeNull();
    expect(frame).toMatchObject({
      descriptor: { layer: 'cloud-base', timestamp: descriptor.timestamp },
      objectUrl: 'blob:cloud-base-06Z',
    });
  });

  it('rejects a raster HTTP error and keeps it out of cache', async () => {
    const descriptor = CLOUD_COVER_FRAME_DESCRIPTORS[2];
    const fetcher = jest.fn(async (input) => (
      String(input).endsWith('.webp')
        ? rasterResponse(503)
        : gridResponse(createAviationScalarGridFixture(
          'cloud-cover',
          descriptor.timestamp,
        ))
    ));
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 1 },
      fetcher: fetcher as typeof fetch,
      createObjectURL: jest.fn(),
      revokeObjectURL: jest.fn(),
    });

    await expect(service.load(descriptor, new AbortController().signal))
      .rejects.toMatchObject({ name: CloudLayerRasterRequestError.name, status: 503 });
    expect(service.size).toBe(0);
  });

  it('keeps a valid raster when the value grid has an HTTP error', async () => {
    const fetcher = jest.fn(async (input) => (
      String(input).endsWith('.webp') ? rasterResponse() : gridResponse({}, 503)
    ));
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 1 },
      fetcher: fetcher as typeof fetch,
      createObjectURL: () => 'blob:raster-without-grid',
      revokeObjectURL: jest.fn(),
    });

    const frame = await service.load(
      CLOUD_COVER_FRAME_DESCRIPTORS[2],
      new AbortController().signal,
    );
    expect(frame.objectUrl).toBe('blob:raster-without-grid');
    expect(frame.valueGrid).toBeNull();
    expect(frame.valueError).toMatchObject({
      name: CloudLayerValueRequestError.name,
      status: 503,
    });
  });

  it('keeps a valid raster and reports corrupt JSON as unavailable values', async () => {
    const fetcher = jest.fn(async (input) => (
      String(input).endsWith('.webp')
        ? rasterResponse()
        : ({
          ok: true,
          status: 200,
          json: jest.fn(async () => { throw new SyntaxError('corrupt'); }),
        } as unknown as Response)
    ));
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 1 },
      fetcher: fetcher as typeof fetch,
      createObjectURL: () => 'blob:corrupt-grid',
      revokeObjectURL: jest.fn(),
    });

    const frame = await service.load(
      CLOUD_COVER_FRAME_DESCRIPTORS[2],
      new AbortController().signal,
    );
    expect(frame.valueGrid).toBeNull();
    expect(frame.valueError).toBeInstanceOf(CloudLayerValueRequestError);
    expect(service.getCached(frame.descriptor.timestamp)).toBe(frame);
  });

  it('rejects external or traversal paths before issuing a request', async () => {
    const fetcher = jest.fn();
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 1 },
      fetcher,
      createObjectURL: jest.fn(),
      revokeObjectURL: jest.fn(),
    });
    const descriptor = CLOUD_COVER_FRAME_DESCRIPTORS[2];

    const externalError = await service.load(
      { ...descriptor, imageUrl: 'https://weather.example/06Z.webp' },
      new AbortController().signal,
    ).catch((error: unknown) => error);
    const traversalError = await service.load(
      { ...descriptor, valueDataUrl: '/media/../private.json' },
      new AbortController().signal,
    ).catch((error: unknown) => error);

    expect([externalError, traversalError]).toEqual([
      expect.objectContaining({
        name: CloudLayerValidationError.name,
        message: 'El descriptor de nubes no coincide con el contrato staged de Fase 18.',
      }),
      expect.objectContaining({
        name: CloudLayerValidationError.name,
        message: 'El descriptor de nubes no coincide con el contrato staged de Fase 18.',
      }),
    ]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(service.size).toBe(0);
  });

  it('returns a cache hit without repeating either request', async () => {
    const fetcher = coverFetcher();
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 1 },
      fetcher,
      createObjectURL: () => 'blob:cached',
      revokeObjectURL: jest.fn(),
    });
    const descriptor = CLOUD_COVER_FRAME_DESCRIPTORS[2];

    const first = await service.load(descriptor, new AbortController().signal);
    const cached = await service.load(descriptor, new AbortController().signal);
    expect(cached).toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('revokes the least-recently-used object URL on bounded eviction', async () => {
    const revokeObjectURL = jest.fn();
    const createObjectURL = jest.fn()
      .mockReturnValueOnce('blob:06Z')
      .mockReturnValueOnce('blob:09Z');
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 1 },
      fetcher: coverFetcher(),
      createObjectURL,
      revokeObjectURL,
    });

    await service.load(CLOUD_COVER_FRAME_DESCRIPTORS[2], new AbortController().signal);
    await service.load(CLOUD_COVER_FRAME_DESCRIPTORS[3], new AbortController().signal);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:06Z');
    expect(service.size).toBe(1);
  });

  it('aborts an obsolete request, prevents it from winning, and revokes its URL', async () => {
    const firstRaster = deferred<Response>();
    const firstGrid = deferred<Response>();
    let callIndex = 0;
    const fetcher = jest.fn((input: RequestInfo | URL) => {
      callIndex += 1;
      if (callIndex === 1) return firstRaster.promise;
      if (callIndex === 2) return firstGrid.promise;
      const url = String(input);
      const descriptor = CLOUD_COVER_FRAME_DESCRIPTORS[3];
      return Promise.resolve(url.endsWith('.webp')
        ? rasterResponse()
        : gridResponse(createAviationScalarGridFixture(
          'cloud-cover',
          descriptor.timestamp,
        )));
    });
    const revokeObjectURL = jest.fn();
    const createObjectURL = jest.fn()
      .mockReturnValueOnce('blob:09Z')
      .mockReturnValueOnce('blob:late-06Z');
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 2 },
      fetcher: fetcher as typeof fetch,
      createObjectURL,
      revokeObjectURL,
    });

    const obsolete = service.load(
      CLOUD_COVER_FRAME_DESCRIPTORS[2],
      new AbortController().signal,
    );
    const latest = await service.load(
      CLOUD_COVER_FRAME_DESCRIPTORS[3],
      new AbortController().signal,
    );
    firstRaster.resolve(rasterResponse());
    firstGrid.resolve(gridResponse(createAviationScalarGridFixture(
      'cloud-cover',
      CLOUD_COVER_FRAME_DESCRIPTORS[2].timestamp,
    )));

    const obsoleteError = await obsolete.catch((error: unknown) => error);
    expect(isCloudLayerAbortError(obsoleteError)).toBe(true);
    expect(latest.objectUrl).toBe('blob:09Z');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:late-06Z');
    expect(service.getCached(latest.descriptor.timestamp)).toBe(latest);
  });

  it('revokes cached object URLs during idempotent destroy', async () => {
    const fetcher = coverFetcher();
    const revokeObjectURL = jest.fn();
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 2 },
      fetcher,
      createObjectURL: () => 'blob:destroyed',
      revokeObjectURL,
    });
    await service.load(CLOUD_COVER_FRAME_DESCRIPTORS[2], new AbortController().signal);

    service.destroy();
    service.destroy();

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:destroyed');
    expect(service.size).toBe(0);
    await expect(service.load(
      CLOUD_COVER_FRAME_DESCRIPTORS[3],
      new AbortController().signal,
    )).rejects.toThrow('destroyed cloud layer service');
  });

  it('propagates an external abort and revokes a late object URL', async () => {
    const raster = deferred<Response>();
    const grid = deferred<Response>();
    const fetcher = jest.fn()
      .mockReturnValueOnce(raster.promise)
      .mockReturnValueOnce(grid.promise);
    const revokeObjectURL = jest.fn();
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 1 },
      fetcher: fetcher as typeof fetch,
      createObjectURL: () => 'blob:aborted',
      revokeObjectURL,
    });
    const controller = new AbortController();
    const loading = service.load(CLOUD_COVER_FRAME_DESCRIPTORS[2], controller.signal);

    controller.abort();
    raster.resolve(rasterResponse());
    grid.resolve(gridResponse(createAviationScalarGridFixture(
      'cloud-cover',
      CLOUD_COVER_FRAME_DESCRIPTORS[2].timestamp,
    )));

    const error = await loading.catch((reason: unknown) => reason);
    expect(isCloudLayerAbortError(error)).toBe(true);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:aborted');
    expect(service.size).toBe(0);
  });

  it('applies an injected retention window and revokes excluded frames', async () => {
    const revokeObjectURL = jest.fn();
    const service = createCloudCoverFrameService({
      cachePolicy: { maxEntries: 3 },
      fetcher: coverFetcher(),
      createObjectURL: jest.fn()
        .mockReturnValueOnce('blob:06Z')
        .mockReturnValueOnce('blob:09Z'),
      revokeObjectURL,
    });
    const at06 = CLOUD_COVER_FRAME_DESCRIPTORS[2];
    const at09 = CLOUD_COVER_FRAME_DESCRIPTORS[3];
    await service.load(at06, new AbortController().signal);
    await service.load(at09, new AbortController().signal);

    service.retain([at09.timestamp]);

    expect(service.getCached(at06.timestamp)).toBeNull();
    expect(service.getCached(at09.timestamp)).not.toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:06Z');
  });
});
