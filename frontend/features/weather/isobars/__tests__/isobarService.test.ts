import {
  expectedIsobarFrame,
  fetchIsobarCatalog,
  fetchIsobarFeatureCollection,
  ISOBAR_DATA_URLS,
  ISOBAR_PRESSURE_LEVELS,
  ISOBAR_TIMESTAMPS,
  IsobarRequestError,
  IsobarValidationError,
  parseIsobarCatalogResponse,
  parseIsobarFeatureCollection,
  type IsobarFeatureCollection,
  type IsobarFrame,
  type IsobarTimestamp,
} from '@/features/weather/isobars';

function validCollection(timestamp: IsobarTimestamp = ISOBAR_TIMESTAMPS[2]) {
  return {
    type: 'FeatureCollection',
    features: ISOBAR_PRESSURE_LEVELS.map((pressure, index) => ({
      type: 'Feature',
      properties: {
        pressure_hpa: pressure,
        timestamp,
        is_simulated: true,
        operational_use: false,
      },
      geometry: {
        type: 'LineString',
        coordinates: [[-81 + index, 3], [-80.5 + index, 4]],
      },
    })),
  };
}

function validCatalog() {
  return {
    scenario: {
      code: 'demo-colombia-001',
      is_simulated: true,
      operational_use: false,
    },
    layers: [],
    timestamps: ISOBAR_TIMESTAMPS,
    overlays: [{
      id: 'pressure-isobars',
      name: 'Isobaras',
      unit: 'hPa',
      frames: ISOBAR_TIMESTAMPS.map((timestamp) => ({
        timestamp,
        data_url: ISOBAR_DATA_URLS[timestamp],
      })),
    }],
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

describe('isobar schema and service', () => {
  it('normalizes the six ordered catalog descriptors', () => {
    expect(parseIsobarCatalogResponse(validCatalog())).toEqual(
      ISOBAR_TIMESTAMPS.map(expectedIsobarFrame),
    );
  });

  it.each([
    ['scenario flags', (catalog: ReturnType<typeof validCatalog>) => {
      catalog.scenario.operational_use = true;
    }],
    ['overlay unit', (catalog: ReturnType<typeof validCatalog>) => {
      catalog.overlays[0].unit = 'Pa';
    }],
    ['frame path', (catalog: ReturnType<typeof validCatalog>) => {
      catalog.overlays[0].frames[2].data_url = '../06Z.geojson';
    }],
  ])('rejects invalid %s in the catalog', (_label, mutate) => {
    const catalog = validCatalog();
    mutate(catalog);
    expect(() => parseIsobarCatalogResponse(catalog)).toThrow(IsobarValidationError);
  });

  it('accepts a complete finite FeatureCollection', () => {
    expect(parseIsobarFeatureCollection(
      validCollection(),
      ISOBAR_TIMESTAMPS[2],
    )).toEqual(validCollection());
  });

  it.each([
    ['pressure', (payload: ReturnType<typeof validCollection>) => {
      (payload.features[0].properties as { pressure_hpa: number }).pressure_hpa = 998;
    }],
    ['timestamp', (payload: ReturnType<typeof validCollection>) => {
      payload.features[0].properties.timestamp = ISOBAR_TIMESTAMPS[0];
    }],
    ['coordinate', (payload: ReturnType<typeof validCollection>) => {
      payload.features[0].geometry.coordinates[0] = [-65, 4];
    }],
    ['geometry', (payload: ReturnType<typeof validCollection>) => {
      payload.features[0].geometry.type = 'Polygon';
    }],
  ])('rejects invalid GeoJSON %s', (_label, mutate) => {
    const payload = validCollection();
    mutate(payload);
    expect(() => parseIsobarFeatureCollection(
      payload,
      ISOBAR_TIMESTAMPS[2],
    )).toThrow(IsobarValidationError);
  });

  it('fetches catalog and one timestamp collection with abort signals', async () => {
    const signal = new AbortController().signal;
    const fetcher = jest.fn()
      .mockResolvedValueOnce(response(validCatalog()))
      .mockResolvedValueOnce(response(validCollection()));
    const frames = await fetchIsobarCatalog({ fetcher, signal });
    const frame = frames[2];
    await expect(fetchIsobarFeatureCollection(frame, {
      fetcher,
      signal,
    })).resolves.toEqual(validCollection());
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      '/api/v1/demo/weather/catalog',
      expect.objectContaining({ signal }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      ISOBAR_DATA_URLS[ISOBAR_TIMESTAMPS[2]],
      expect.objectContaining({ signal }),
    );
  });

  it('rejects a frame outside the frozen catalog before fetching it', async () => {
    const fetcher = jest.fn();
    const frame = {
      ...expectedIsobarFrame(ISOBAR_TIMESTAMPS[2]),
      dataUrl: 'https://example.invalid/isobars.geojson',
    } as unknown as IsobarFrame;

    await expect(fetchIsobarFeatureCollection(frame, { fetcher })).rejects.toBeInstanceOf(
      IsobarValidationError,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns typed errors for HTTP and invalid JSON responses', async () => {
    await expect(fetchIsobarCatalog({
      fetcher: (async () => response({}, { ok: false, status: 503 })) as typeof fetch,
    })).rejects.toBeInstanceOf(IsobarRequestError);
    await expect(fetchIsobarCatalog({
      fetcher: (async () => response({}, {
        json: jest.fn(async () => { throw new Error('invalid'); }),
      })) as typeof fetch,
    })).rejects.toBeInstanceOf(IsobarRequestError);
  });
});

export function isobarFixture(
  timestamp: IsobarTimestamp = ISOBAR_TIMESTAMPS[2],
): IsobarFeatureCollection {
  return validCollection(timestamp) as IsobarFeatureCollection;
}
