import { parseWeatherCatalog, WeatherServiceError } from '@/lib/services/weatherService';

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
    scenario: {
      code: 'demo-colombia-001',
      name: 'Escenario meteorológico ilustrativo',
      scenario_date: '2026-01-15',
      is_simulated: true,
      operational_use: false,
    },
    layers: [
      { id: 'temperature', name: 'Temperatura', kind: 'scalar', unit: '°C', minimum: 0, maximum: 38 },
      { id: 'wind', name: 'Viento', kind: 'vector', unit: 'kt', minimum: 0, maximum: 60 },
      {
        id: 'precipitation',
        name: 'Precipitación simulada',
        kind: 'scalar',
        unit: 'mm/h',
        minimum: 0,
        maximum: 40,
      },
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

describe('weather service Phase 13 compatibility', () => {
  it('publishes the three primary layers and six isobar descriptors', () => {
    const catalog = parseWeatherCatalog(enrichedCatalog());

    expect(catalog.layers.map((layer) => layer.id)).toEqual([
      'temperature',
      'wind',
      'precipitation',
    ]);
    expect(catalog.isobarFrames).toHaveLength(6);
  });

  it('does not silently accept a malformed precipitation extension', () => {
    const catalog = enrichedCatalog();
    catalog.layers[2].unit = 'dBZ';

    expect(() => parseWeatherCatalog(catalog)).toThrow(WeatherServiceError);
  });
});
