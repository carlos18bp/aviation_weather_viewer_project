import {
  AirportPayloadValidationError,
  AirportServiceError,
  fetchAirports,
  fetchAirportWeather,
} from '@/features/airports';

import {
  AIRPORT_WEATHER_FIXTURE,
  createAirportCollectionFixture,
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
});
