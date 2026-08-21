import { createDeterministicWindField } from '@/features/weather/wind';
import {
  createWeatherFrameService,
  parseWeatherCatalog,
  WeatherServiceError,
} from '@/lib/services/weatherService';

const TIMESTAMPS = [
  '2026-01-15T00:00:00Z',
  '2026-01-15T03:00:00Z',
  '2026-01-15T06:00:00Z',
  '2026-01-15T09:00:00Z',
  '2026-01-15T12:00:00Z',
  '2026-01-15T15:00:00Z',
];

function enrichedCatalog() {
  return {
    schema_version: 3,
    scenario: {
      code: 'demo-colombia-001',
      name: 'Escenario meteorológico ilustrativo',
      scenario_date: '2026-01-15',
      is_simulated: true,
      operational_use: false,
    },
    layers: [
      { id: 'temperature', name: 'Temperatura', category: 'essential', kind: 'scalar', unit: '°C', minimum: 0, maximum: 38, supports_point_value: true },
      { id: 'wind', name: 'Viento', category: 'essential', kind: 'vector', unit: 'kt', minimum: 0, maximum: 60, supports_point_value: true },
      {
        id: 'precipitation',
        name: 'Precipitación simulada',
        category: 'essential',
        kind: 'scalar',
        unit: 'mm/h',
        minimum: 0,
        maximum: 40,
        supports_point_value: false,
      },
      { id: 'cloud-cover', name: 'Nubosidad simulada', category: 'aviation', kind: 'scalar', unit: '%', minimum: 0, maximum: 100, supports_point_value: true },
      { id: 'cloud-base', name: 'Base de nubes simulada', category: 'aviation', kind: 'scalar', unit: 'ft AGL', minimum: 300, maximum: 15000, supports_point_value: true },
      { id: 'visibility', name: 'Visibilidad simulada', category: 'aviation', kind: 'scalar', unit: 'km', minimum: 1, maximum: 20, supports_point_value: true },
      { id: 'wind-gusts', name: 'Ráfagas simuladas', category: 'aviation', kind: 'scalar', unit: 'kt', minimum: 0, maximum: 80, supports_point_value: true },
    ],
    timestamps: TIMESTAMPS,
    overlays: [{
      id: 'pressure-isobars',
      name: 'Isobaras',
      unit: 'hPa',
      frames: TIMESTAMPS.map((timestamp) => ({
        timestamp,
        data_url: `/media/demo-weather/demo-colombia-001/pressure-isobars/${timestamp.slice(11, 13)}Z.geojson`,
      })),
    }],
  };
}

describe('weather service schema 3 integration', () => {
  it('publishes seven ordered primary layers and six isobar descriptors', () => {
    const catalog = parseWeatherCatalog(enrichedCatalog());

    expect(catalog.layers.map((layer) => layer.id)).toEqual([
      'temperature',
      'wind',
      'precipitation',
      'cloud-cover',
      'cloud-base',
      'visibility',
      'wind-gusts',
    ]);
    expect(catalog.layers.filter((layer) => layer.category === 'aviation')).toHaveLength(4);
    expect(catalog.isobarFrames).toHaveLength(6);
  });

  it('does not silently accept a malformed precipitation extension', () => {
    const catalog = enrichedCatalog();
    catalog.layers[2].unit = 'dBZ';

    expect(() => parseWeatherCatalog(catalog)).toThrow(WeatherServiceError);
  });

  it('rejects schema 2 and extra fields instead of partially parsing them', () => {
    const schemaTwo = enrichedCatalog();
    schemaTwo.schema_version = 2;
    const extraField = enrichedCatalog() as ReturnType<typeof enrichedCatalog> & {
      generated_at?: string;
    };
    extraField.generated_at = 'runtime';

    expect(() => parseWeatherCatalog(schemaTwo)).toThrow(WeatherServiceError);
    expect(() => parseWeatherCatalog(extraField)).toThrow(WeatherServiceError);
  });

  it('binds the fetch facade before handing it to integrated layer services', async () => {
    const timestamp = '2026-01-15T06:00:00Z' as const;
    const field = createDeterministicWindField(timestamp);
    const receiverValues: unknown[] = [];
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: jest.fn(() => 'blob:phase-23') },
      revokeObjectURL: { configurable: true, value: jest.fn() },
    });
    const fetcher = jest.fn(function boundFetchExpectation(
      this: unknown,
      input: RequestInfo | URL,
    ) {
      receiverValues.push(this);
      const payload = String(input).startsWith('/api/')
        ? {
            scenario: 'demo-colombia-001',
            layer: 'wind',
            timestamp,
            unit: 'kt',
            is_simulated: true,
            operational_use: false,
            coverage: { west: -82, south: -5, east: -66, north: 14 },
            minimum: 0,
            maximum: 60,
            data_url: '/media/demo-weather/demo-colombia-001/wind/06Z.json',
          }
        : field;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => payload,
      } as Response);
    });
    const service = createWeatherFrameService({ fetcher: fetcher as typeof fetch });

    try {
      await expect(service.load('wind', timestamp, new AbortController().signal))
        .resolves.toMatchObject({ layer: 'wind', timestamp });
      expect(receiverValues).toEqual([globalThis, globalThis]);
    } finally {
      service.destroy();
      Reflect.deleteProperty(URL, 'createObjectURL');
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });
});
