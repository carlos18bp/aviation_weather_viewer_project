import {
  AirportPayloadValidationError,
  AirportServiceError,
  DEMO_TIMESTAMPS,
  fetchAirports,
  fetchAirportWeather,
  fetchAirportWeatherSeries,
} from '@/features/airports';
import { createAirportTrendPoints } from '@/features/airports/trend/airportTrendSeries';

import {
  AIRPORT_WEATHER_FIXTURE,
  createAirportCollectionFixture,
  createAirportWeatherSeriesFixture,
} from './airportTestFixtures';


const originalFetch = global.fetch;
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe('airport service', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns the six frozen airports', async () => {
    fetchMock.mockResolvedValue(jsonResponse(createAirportCollectionFixture()));

    const collection = await fetchAirports();

    expect(collection.features).toHaveLength(6);
    expect(collection.features.map((feature) => feature.properties.icao_code)).toEqual([
      'SKBO',
      'SKRG',
      'SKCL',
      'SKBQ',
      'SKCG',
      'SKSM',
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/airports', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('rejects an incomplete airport collection', async () => {
    const collection = createAirportCollectionFixture();
    collection.features.pop();
    fetchMock.mockResolvedValue(jsonResponse(collection));

    await expect(fetchAirports()).rejects.toBeInstanceOf(AirportPayloadValidationError);
  });

  it('returns a validated airport condition', async () => {
    fetchMock.mockResolvedValue(jsonResponse(AIRPORT_WEATHER_FIXTURE));

    const condition = await fetchAirportWeather('skbo', '2026-01-15T06:00:00Z');

    expect(condition).toEqual(AIRPORT_WEATHER_FIXTURE);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/demo/airports/SKBO/weather?timestamp=2026-01-15T06%3A00%3A00Z',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('rejects a mismatched weather timestamp', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      ...AIRPORT_WEATHER_FIXTURE,
      timestamp: '2026-01-15T09:00:00Z',
    }));

    await expect(
      fetchAirportWeather('SKBO', '2026-01-15T06:00:00Z'),
    ).rejects.toBeInstanceOf(AirportPayloadValidationError);
  });

  it('exposes the airport 404 contract', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      error: {
        code: 'airport_not_found',
        message: 'El aeropuerto solicitado no existe.',
      },
      is_simulated: true,
      operational_use: false,
    }, 404));

    await expect(
      fetchAirportWeather('SKBO', '2026-01-15T06:00:00Z'),
    ).rejects.toMatchObject<Partial<AirportServiceError>>({
      name: 'AirportServiceError',
      status: 404,
      code: 'airport_not_found',
      message: 'El aeropuerto solicitado no existe.',
    });
  });

  it('propagates AbortError without wrapping', async () => {
    const controller = new AbortController();
    const abortError = new DOMException('The request was aborted.', 'AbortError');
    fetchMock.mockRejectedValue(abortError);

    const request = fetchAirports({ signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toBe(abortError);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/airports', expect.objectContaining({
      signal: controller.signal,
    }));
  });

  it('loads the six airport conditions once and returns canonical trend points', async () => {
    const responses = createAirportWeatherSeriesFixture();
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      const timestamp = url.searchParams.get('timestamp');
      const response = responses.find((candidate) => candidate.timestamp === timestamp);
      return jsonResponse(response);
    });

    const points = await fetchAirportWeatherSeries('SKBO');

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(points.map((point) => point.timestamp)).toEqual(DEMO_TIMESTAMPS);
    expect(points[0]).toEqual({
      timestamp: DEMO_TIMESTAMPS[0],
      temperatureC: 13,
      windSpeedKt: 7,
      windDirectionDeg: 70,
      visibilityKm: 8,
      pressureHpa: 1019,
    });
  });

  it('rejects duplicate timestamps in an assembled series', () => {
    const responses = createAirportWeatherSeriesFixture();
    responses[5] = { ...responses[5], timestamp: responses[4].timestamp };

    expect(() => createAirportTrendPoints(responses)).toThrow(/duplicado/);
  });

  it('rejects a series with a missing condition', () => {
    const responses = createAirportWeatherSeriesFixture().slice(0, 5);

    expect(() => createAirportTrendPoints(responses)).toThrow(/exactamente seis/);
  });

  it('aborts sibling requests when one series condition is invalid', async () => {
    const responses = createAirportWeatherSeriesFixture();
    const requestSignals: AbortSignal[] = [];
    fetchMock.mockImplementation((input, init) => {
      const url = new URL(String(input), 'http://localhost');
      const timestamp = url.searchParams.get('timestamp');
      const signal = init?.signal as AbortSignal;
      requestSignals.push(signal);

      if (timestamp === DEMO_TIMESTAMPS[2]) {
        const invalidResponse = {
          ...responses[2],
          operational_use: true,
        };
        return Promise.resolve(jsonResponse(invalidResponse));
      }

      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The request was aborted.', 'AbortError'));
        }, { once: true });
      });
    });

    await expect(fetchAirportWeatherSeries('SKBO')).rejects.toBeInstanceOf(
      AirportPayloadValidationError,
    );

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(requestSignals).toHaveLength(6);
    expect(requestSignals.every((signal) => signal.aborted)).toBe(true);
  });

  it('propagates external abort to all six series requests', async () => {
    const controller = new AbortController();
    const requestSignals: AbortSignal[] = [];
    fetchMock.mockImplementation((_input, init) => {
      const signal = init?.signal as AbortSignal;
      requestSignals.push(signal);
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The request was aborted.', 'AbortError'));
        }, { once: true });
      });
    });

    const request = fetchAirportWeatherSeries('SKBO', { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(requestSignals.every((signal) => signal.aborted)).toBe(true);
  });
});
