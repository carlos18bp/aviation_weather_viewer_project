import {
  DEMO_TIMESTAMPS,
  type DemoTimestamp,
} from '@/features/airports';
import {
  expectedTemperatureImageUrl,
  expectedTemperatureValueUrl,
  expectedWindFieldUrl,
  sampleWeatherAtCoordinate,
  TEMPERATURE_VALUE_GRID_COUNT,
  WeatherPickerDataService,
  WeatherPickerRequestError,
} from '@/features/weather/picker';
import { createDeterministicWindField } from '@/features/weather/wind';

const ACTIVE_TIMESTAMP: DemoTimestamp = '2026-01-15T06:00:00Z';

function frameDescriptor(layer: 'temperature' | 'wind', timestamp: DemoTimestamp) {
  return {
    scenario: 'demo-colombia-001',
    layer,
    timestamp,
    unit: layer === 'temperature' ? '°C' : 'kt',
    is_simulated: true,
    operational_use: false,
    coverage: { west: -82, south: -5, east: -66, north: 14 },
    minimum: 0,
    maximum: layer === 'temperature' ? 38 : 60,
    data_url: layer === 'temperature'
      ? expectedTemperatureImageUrl(timestamp)
      : expectedWindFieldUrl(timestamp),
    ...(layer === 'temperature'
      ? { value_data_url: expectedTemperatureValueUrl(timestamp) }
      : {}),
  };
}

function temperatureGrid(timestamp: DemoTimestamp) {
  return {
    scenario: 'demo-colombia-001',
    layer: 'temperature',
    width: 128,
    height: 160,
    bbox: [-82, -5, -66, 14],
    unit: '°C',
    timestamp,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    values: Array.from({ length: TEMPERATURE_VALUE_GRID_COUNT }, () => 20),
  };
}

function response(payload: unknown, overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: jest.fn(async () => payload),
    ...overrides,
  } as unknown as Response;
}

function timestampFromUrl(url: string): DemoTimestamp {
  const parsed = new URL(url, 'https://demo.local');
  const queryTimestamp = parsed.searchParams.get('timestamp');
  if (queryTimestamp) {
    return queryTimestamp as DemoTimestamp;
  }
  const label = url.match(/\/(\d{2})Z\.(?:json|webp)$/)?.[1];
  return DEMO_TIMESTAMPS.find((timestamp) => timestamp.slice(11, 13) === label)
    ?? ACTIVE_TIMESTAMP;
}

function payloadForUrl(url: string): unknown {
  const timestamp = timestampFromUrl(url);
  if (url.includes('/frames?')) {
    const layer = new URL(url, 'https://demo.local').searchParams.get('layer');
    return frameDescriptor(layer as 'temperature' | 'wind', timestamp);
  }
  if (url.includes('/temperature-values/')) {
    return temperatureGrid(timestamp);
  }
  return createDeterministicWindField(timestamp);
}

function successfulFetcher() {
  return jest.fn(async (input: RequestInfo | URL) => response(payloadForUrl(String(input))));
}

describe('WeatherPickerDataService', () => {
  it('uses an injected U/V field and fetches only temperature metadata and grid', async () => {
    const service = new WeatherPickerDataService();
    const fetcher = successfulFetcher();
    const wind = createDeterministicWindField(ACTIVE_TIMESTAMP);

    const data = await service.load(ACTIVE_TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
      wind,
    });

    expect(data.timestamp).toBe(ACTIVE_TIMESTAMP);
    expect(data.wind).toEqual(wind);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('caches fields so moving the coordinate performs no new request', async () => {
    const service = new WeatherPickerDataService();
    const fetcher = successfulFetcher();
    const data = await service.load(ACTIVE_TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
      wind: createDeterministicWindField(ACTIVE_TIMESTAMP),
    });

    sampleWeatherAtCoordinate({ ...data, coordinate: [-74, 4] });
    sampleWeatherAtCoordinate({ ...data, coordinate: [-75, 5] });
    await service.load(ACTIVE_TIMESTAMP, { fetcher: fetcher as typeof fetch });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('loads U/V itself when the orchestrator does not provide it', async () => {
    const service = new WeatherPickerDataService();
    const fetcher = successfulFetcher();

    await service.load(ACTIVE_TIMESTAMP, { fetcher: fetcher as typeof fetch });

    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it('keeps only the active timestamp and its adjacent cache entries', async () => {
    const service = new WeatherPickerDataService();
    const fetcher = successfulFetcher();
    await service.load(ACTIVE_TIMESTAMP, { fetcher: fetcher as typeof fetch });
    await service.preloadAdjacent(ACTIVE_TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
      windByTimestamp: {
        [DEMO_TIMESTAMPS[1]]: createDeterministicWindField(DEMO_TIMESTAMPS[1]),
        [DEMO_TIMESTAMPS[3]]: createDeterministicWindField(DEMO_TIMESTAMPS[3]),
      },
    });

    expect(service.getCached(DEMO_TIMESTAMPS[1])).not.toBeNull();
    expect(service.getCached(ACTIVE_TIMESTAMP)).not.toBeNull();
    expect(service.getCached(DEMO_TIMESTAMPS[3])).not.toBeNull();

    await service.load(DEMO_TIMESTAMPS[5], {
      fetcher: fetcher as typeof fetch,
      wind: createDeterministicWindField(DEMO_TIMESTAMPS[5]),
    });

    expect(service.getCached(DEMO_TIMESTAMPS[1])).toBeNull();
    expect(service.getCached(ACTIVE_TIMESTAMP)).toBeNull();
    expect(service.getCached(DEMO_TIMESTAMPS[5])).not.toBeNull();
  });

  it('rejects a late response after a newer timestamp wins', async () => {
    const service = new WeatherPickerDataService();
    let resolveFirst!: (value: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    let fetchCount = 0;
    const fetcher = jest.fn((input: RequestInfo | URL): Promise<Response> => {
      fetchCount += 1;
      return fetchCount === 1
        ? firstResponse
        : Promise.resolve(response(payloadForUrl(String(input))));
    });
    const first = service.load(DEMO_TIMESTAMPS[0], {
      fetcher: fetcher as typeof fetch,
      wind: createDeterministicWindField(DEMO_TIMESTAMPS[0]),
    });
    const second = service.load(DEMO_TIMESTAMPS[1], {
      fetcher: fetcher as typeof fetch,
      wind: createDeterministicWindField(DEMO_TIMESTAMPS[1]),
    });

    await expect(second).resolves.toMatchObject({ timestamp: DEMO_TIMESTAMPS[1] });
    resolveFirst(response(frameDescriptor('temperature', DEMO_TIMESTAMPS[0])));

    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(service.getCached(DEMO_TIMESTAMPS[0])).toBeNull();
  });

  it('does not cache a failed request and permits retry', async () => {
    const service = new WeatherPickerDataService();
    const fetcher = successfulFetcher();
    fetcher.mockResolvedValueOnce(response({}, { ok: false, status: 503 }));

    await expect(service.load(ACTIVE_TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
      wind: createDeterministicWindField(ACTIVE_TIMESTAMP),
    })).rejects.toBeInstanceOf(WeatherPickerRequestError);
    await expect(service.load(ACTIVE_TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
      wind: createDeterministicWindField(ACTIVE_TIMESTAMP),
    })).resolves.toMatchObject({ timestamp: ACTIVE_TIMESTAMP });
  });

  it('aborts active work and rejects later use after destroy', async () => {
    const service = new WeatherPickerDataService();
    const fetcher = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      })
    ));
    const loading = service.load(ACTIVE_TIMESTAMP, {
      fetcher: fetcher as typeof fetch,
      wind: createDeterministicWindField(ACTIVE_TIMESTAMP),
    });

    service.destroy();

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    await expect(service.load(ACTIVE_TIMESTAMP)).rejects.toThrow(
      'Cannot use a destroyed weather picker data service.',
    );
  });
});
