import {
  fetchTemperatureFrame,
  preloadTemperatureImage,
  TEMPERATURE_BBOX,
  TEMPERATURE_IMAGE_URLS,
  TEMPERATURE_TIMESTAMPS,
  TemperatureFrameRequestError,
  TemperatureFrameValidationError,
  TemperatureImageLoadError,
} from '@/features/weather/temperature';

const REQUESTED_TIMESTAMP = TEMPERATURE_TIMESTAMPS[2];

function validMetadata() {
  return {
    scenario: 'demo-colombia-001',
    layer: 'temperature',
    timestamp: REQUESTED_TIMESTAMP,
    unit: '°C',
    is_simulated: true,
    operational_use: false,
    coverage: { west: -82, south: -5, east: -66, north: 14 },
    minimum: 0,
    maximum: 38,
    data_url: TEMPERATURE_IMAGE_URLS[REQUESTED_TIMESTAMP],
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

function imageDouble(
  scheduleOutcome: (image: HTMLImageElement) => void,
): HTMLImageElement {
  const image = new EventTarget() as HTMLImageElement;
  let source = '';

  Object.defineProperty(image, 'src', {
    configurable: true,
    get: () => source,
    set: (value: string) => {
      source = value;
      scheduleOutcome(image);
    },
  });
  image.removeAttribute = jest.fn(() => {
    source = '';
  });
  return image;
}

const loadImage = () => imageDouble((image) => {
  queueMicrotask(() => image.dispatchEvent(new Event('load')));
});
const brokenImage = () => imageDouble((image) => {
  queueMicrotask(() => image.dispatchEvent(new Event('error')));
});
const pendingImage = () => imageDouble(() => undefined);

describe('temperature service', () => {
  it('fetches and normalizes the frozen temperature descriptor', async () => {
    const fetcher = jest.fn(async () => responseDouble());
    const signal = new AbortController().signal;

    const frame = await fetchTemperatureFrame(REQUESTED_TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
      signal,
    });

    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/demo/weather/frames?layer=temperature&timestamp=2026-01-15T06%3A00%3A00Z',
      {
        method: 'GET',
        signal,
        headers: { Accept: 'application/json' },
      },
    );
    expect(frame).toEqual({
      scenario: 'demo-colombia-001',
      layer: 'temperature',
      timestamp: REQUESTED_TIMESTAMP,
      unit: '°C',
      isSimulated: true,
      operationalUse: false,
      bbox: TEMPERATURE_BBOX,
      minimum: 0,
      maximum: 38,
      imageUrl: TEMPERATURE_IMAGE_URLS[REQUESTED_TIMESTAMP],
    });
  });

  it('rejects an unknown requested timestamp before calling the API', async () => {
    const fetcher = jest.fn(async () => responseDouble());

    await expect(fetchTemperatureFrame('2026-01-15T01:00:00Z', {
      fetcher: fetcher as typeof fetch,
    })).rejects.toMatchObject({
      name: TemperatureFrameValidationError.name,
      message: 'Temperature timestamp is outside the frozen catalog.',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns a typed request error for a failed metadata response', async () => {
    const fetcher = jest.fn(async () => responseDouble({ ok: false, status: 503 }));

    await expect(fetchTemperatureFrame(REQUESTED_TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
    })).rejects.toMatchObject({
      name: TemperatureFrameRequestError.name,
      status: 503,
    });
  });

  it.each([
    ['layer', { layer: 'wind' }],
    ['timestamp', { timestamp: TEMPERATURE_TIMESTAMPS[0] }],
    ['unit', { unit: 'K' }],
    ['bbox', { coverage: { west: -81, south: -5, east: -66, north: 14 } }],
  ])('rejects invalid %s metadata before image loading', async (_label, mutation) => {
    const fetcher = jest.fn(async () => responseDouble({
      json: jest.fn(async () => ({ ...validMetadata(), ...mutation })),
    }));

    await expect(fetchTemperatureFrame(REQUESTED_TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
    })).rejects.toBeInstanceOf(TemperatureFrameValidationError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['safety flags', { operational_use: true }],
    ['range', { maximum: 40 }],
    ['data URL', { data_url: '/media/temperature/unknown.webp' }],
  ])('rejects invalid %s metadata', async (_label, mutation) => {
    const fetcher = jest.fn(async () => responseDouble({
      json: jest.fn(async () => ({ ...validMetadata(), ...mutation })),
    }));

    await expect(fetchTemperatureFrame(REQUESTED_TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
    })).rejects.toBeInstanceOf(TemperatureFrameValidationError);
  });

  it('preloads a WebP blob and revokes its object URL after decode', async () => {
    const image = loadImage();
    const createObjectURL = jest.fn(() => 'blob:temperature-frame');
    const revokeObjectURL = jest.fn();
    const fetcher = jest.fn(async () => responseDouble());

    await expect(preloadTemperatureImage(TEMPERATURE_IMAGE_URLS[REQUESTED_TIMESTAMP], {
      fetcher: fetcher as typeof fetch,
      imageFactory: () => image,
      createObjectURL,
      revokeObjectURL,
    })).resolves.toBe(image);

    expect(fetcher).toHaveBeenCalledWith(TEMPERATURE_IMAGE_URLS[REQUESTED_TIMESTAMP], {
      method: 'GET',
      signal: undefined,
      headers: { Accept: 'image/webp' },
    });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:temperature-frame');
  });

  it('rejects a broken image while revoking temporary resources', async () => {
    const image = brokenImage();
    const revokeObjectURL = jest.fn();

    await expect(preloadTemperatureImage(TEMPERATURE_IMAGE_URLS[REQUESTED_TIMESTAMP], {
      fetcher: (async () => responseDouble()) as typeof fetch,
      imageFactory: () => image,
      createObjectURL: () => 'blob:broken-temperature-frame',
      revokeObjectURL,
    })).rejects.toBeInstanceOf(TemperatureImageLoadError);

    expect(image.removeAttribute).toHaveBeenCalledWith('src');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:broken-temperature-frame');
  });

  it('aborts image decode without retaining its object URL', async () => {
    const image = pendingImage();
    const controller = new AbortController();
    const revokeObjectURL = jest.fn();
    const preload = preloadTemperatureImage(TEMPERATURE_IMAGE_URLS[REQUESTED_TIMESTAMP], {
      signal: controller.signal,
      fetcher: (async () => responseDouble()) as typeof fetch,
      imageFactory: () => image,
      createObjectURL: () => 'blob:aborted-temperature-frame',
      revokeObjectURL,
    });

    controller.abort();

    await expect(preload).rejects.toMatchObject({ name: 'AbortError' });
    expect(image.removeAttribute).toHaveBeenCalledWith('src');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:aborted-temperature-frame');
  });

  it('rejects a non-WebP response before allocating an object URL', async () => {
    const createObjectURL = jest.fn(() => 'blob:not-webp');

    await expect(preloadTemperatureImage(TEMPERATURE_IMAGE_URLS[REQUESTED_TIMESTAMP], {
      fetcher: (async () => responseDouble({
        blob: jest.fn(async () => new Blob(['png'], { type: 'image/png' })),
      })) as typeof fetch,
      createObjectURL,
    })).rejects.toMatchObject({
      name: TemperatureImageLoadError.name,
      message: 'Temperature image response is not WebP.',
    });

    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('revokes the object URL when image allocation fails', async () => {
    const revokeObjectURL = jest.fn();

    await expect(preloadTemperatureImage(TEMPERATURE_IMAGE_URLS[REQUESTED_TIMESTAMP], {
      fetcher: (async () => responseDouble()) as typeof fetch,
      imageFactory: () => {
        throw new Error('image allocation failed');
      },
      createObjectURL: () => 'blob:allocation-failed',
      revokeObjectURL,
    })).rejects.toThrow('image allocation failed');

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:allocation-failed');
  });
});
