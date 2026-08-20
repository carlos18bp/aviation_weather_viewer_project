import {
  fetchPrecipitationFrame,
  PRECIPITATION_BBOX,
  PRECIPITATION_IMAGE_URLS,
  PRECIPITATION_TIMESTAMPS,
  preloadPrecipitationImage,
  PrecipitationFrameRequestError,
  PrecipitationFrameValidationError,
  PrecipitationImageLoadError,
} from '@/features/weather/precipitation';

const TIMESTAMP = PRECIPITATION_TIMESTAMPS[2];

function validMetadata() {
  return {
    scenario: 'demo-colombia-001',
    layer: 'precipitation',
    timestamp: TIMESTAMP,
    unit: 'mm/h',
    is_simulated: true,
    operational_use: false,
    coverage: { west: -82, south: -5, east: -66, north: 14 },
    minimum: 0,
    maximum: 40,
    data_url: PRECIPITATION_IMAGE_URLS[TIMESTAMP],
  };
}

function responseDouble(overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: jest.fn(async () => validMetadata()),
    blob: jest.fn(async () => new Blob(['webp'], { type: 'image/webp' })),
    ...overrides,
  } as unknown as Response;
}

function imageDouble(outcome: 'load' | 'error' | 'pending'): HTMLImageElement {
  const image = new EventTarget() as HTMLImageElement;
  let source = '';
  Object.defineProperty(image, 'src', {
    configurable: true,
    get: () => source,
    set: (value: string) => {
      source = value;
      if (outcome !== 'pending') {
        queueMicrotask(() => image.dispatchEvent(new Event(outcome)));
      }
    },
  });
  image.removeAttribute = jest.fn(() => { source = ''; });
  return image;
}

describe('precipitation service', () => {
  it('fetches and normalizes the frozen precipitation descriptor', async () => {
    const fetcher = jest.fn(async () => responseDouble());

    await expect(fetchPrecipitationFrame(TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
    })).resolves.toEqual({
      scenario: 'demo-colombia-001',
      layer: 'precipitation',
      timestamp: TIMESTAMP,
      unit: 'mm/h',
      minimum: 0,
      maximum: 40,
      imageUrl: PRECIPITATION_IMAGE_URLS[TIMESTAMP],
      isSimulated: true,
      operationalUse: false,
    });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/demo/weather/frames?layer=precipitation&timestamp=2026-01-15T06%3A00%3A00Z',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(PRECIPITATION_BBOX).toEqual([-82, -5, -66, 14]);
  });

  it('rejects invalid timestamp before requesting metadata', async () => {
    const fetcher = jest.fn();
    const error = await fetchPrecipitationFrame('2026-01-15T01:00:00Z', {
      fetcher,
    }).catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: PrecipitationFrameValidationError.name,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['flags', { operational_use: true }],
    ['range', { maximum: 41 }],
    ['coverage', { coverage: { west: -81, south: -5, east: -66, north: 14 } }],
    ['path', { data_url: '/media/precipitation/unknown.webp' }],
    ['extra value URL', { value_data_url: '/media/forbidden.json' }],
  ])('rejects invalid %s metadata', async (_label, mutation) => {
    const fetcher = jest.fn(async () => responseDouble({
      json: jest.fn(async () => ({ ...validMetadata(), ...mutation })),
    }));
    await expect(fetchPrecipitationFrame(TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
    })).rejects.toBeInstanceOf(PrecipitationFrameValidationError);
  });

  it('returns a typed error for failed or non-JSON metadata', async () => {
    const failed = jest.fn(async () => responseDouble({ ok: false, status: 503 }));
    await expect(fetchPrecipitationFrame(TIMESTAMP, {
      fetcher: failed as typeof fetch,
    })).rejects.toBeInstanceOf(PrecipitationFrameRequestError);

    const invalid = jest.fn(async () => responseDouble({
      json: jest.fn(async () => { throw new Error('invalid JSON'); }),
    }));
    await expect(fetchPrecipitationFrame(TIMESTAMP, {
      fetcher: invalid as typeof fetch,
    })).rejects.toBeInstanceOf(PrecipitationFrameRequestError);
  });

  it('preloads WebP and revokes its temporary object URL', async () => {
    const image = imageDouble('load');
    const revokeObjectURL = jest.fn();
    await expect(preloadPrecipitationImage(PRECIPITATION_IMAGE_URLS[TIMESTAMP], {
      fetcher: (async () => responseDouble()) as typeof fetch,
      imageFactory: () => image,
      createObjectURL: () => 'blob:precipitation',
      revokeObjectURL,
    })).resolves.toBe(image);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:precipitation');
  });

  it('cleans up a broken or aborted image load', async () => {
    const broken = imageDouble('error');
    await expect(preloadPrecipitationImage(PRECIPITATION_IMAGE_URLS[TIMESTAMP], {
      fetcher: (async () => responseDouble()) as typeof fetch,
      imageFactory: () => broken,
      createObjectURL: () => 'blob:broken',
      revokeObjectURL: jest.fn(),
    })).rejects.toBeInstanceOf(PrecipitationImageLoadError);
    expect(broken.removeAttribute).toHaveBeenCalledWith('src');

    const pending = imageDouble('pending');
    const controller = new AbortController();
    const preload = preloadPrecipitationImage(PRECIPITATION_IMAGE_URLS[TIMESTAMP], {
      signal: controller.signal,
      fetcher: (async () => responseDouble()) as typeof fetch,
      imageFactory: () => pending,
      createObjectURL: () => 'blob:pending',
      revokeObjectURL: jest.fn(),
    });
    controller.abort();
    await expect(preload).rejects.toMatchObject({ name: 'AbortError' });
    expect(pending.removeAttribute).toHaveBeenCalledWith('src');
  });

  it('rejects a non-WebP response before image allocation', async () => {
    const imageFactory = jest.fn();
    const error = await preloadPrecipitationImage(PRECIPITATION_IMAGE_URLS[TIMESTAMP], {
      fetcher: (async () => responseDouble({
        blob: jest.fn(async () => new Blob(['png'], { type: 'image/png' })),
      })) as typeof fetch,
      imageFactory,
    }).catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      name: PrecipitationImageLoadError.name,
    });
    expect(imageFactory).not.toHaveBeenCalled();
  });
});
