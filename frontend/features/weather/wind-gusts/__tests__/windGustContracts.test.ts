import { DEMO_TIMESTAMPS, type DemoTimestamp } from '@/features/airports';
import {
  createAviationScalarGridFixture,
} from '@/features/weather/aviation-layer-contracts';
import {
  parseWindGustFrameDescriptor,
  parseWindGustGrid,
  sampleWindGustAtCoordinate,
  WIND_GUST_FRAME_DESCRIPTORS,
  WIND_GUST_LEGEND,
  WIND_GUST_OPACITY,
  WIND_GUST_ROUNDING_TOLERANCE_KT,
  WindGustValidationError,
} from '@/features/weather/wind-gusts';
import {
  WIND_FIELD_HEIGHT,
  WIND_FIELD_WIDTH,
  type WindField,
} from '@/features/weather/wind';

const TIMESTAMP = DEMO_TIMESTAMPS[2];

function windField(speedKt: number, timestamp: DemoTimestamp = TIMESTAMP): WindField {
  const length = WIND_FIELD_WIDTH * WIND_FIELD_HEIGHT;
  return {
    scenario: 'demo-colombia-001',
    width: WIND_FIELD_WIDTH,
    height: WIND_FIELD_HEIGHT,
    bbox: [-82, -5, -66, 14],
    unit: 'kt',
    timestamp,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    u: Array.from({ length }, () => speedKt),
    v: Array.from({ length }, () => 0),
  };
}

describe('wind-gust contracts and sampler', () => {
  it('publishes six exact descriptors, legend, scalar range, and opacity', () => {
    expect(WIND_GUST_FRAME_DESCRIPTORS).toHaveLength(6);
    expect(new Set(WIND_GUST_FRAME_DESCRIPTORS.map(({ timestamp }) => timestamp)))
      .toEqual(new Set(DEMO_TIMESTAMPS));
    expect(WIND_GUST_LEGEND).toMatchObject({
      title: 'Ráfagas simuladas',
      unit: 'kt',
      minimum: 0,
      maximum: 80,
    });
    expect(WIND_GUST_LEGEND.colorStops).toEqual([
      [0, '#00000000'],
      [15, '#22d3eeb3'],
      [30, '#22c55ecc'],
      [45, '#f97316e6'],
      [60, '#d946eff2'],
      [80, '#7c3aedff'],
    ]);
    expect(WIND_GUST_OPACITY).toBe(0.66);
  });

  it('parses a staged descriptor and rejects field, flag, unit, and range drift', () => {
    const descriptor = WIND_GUST_FRAME_DESCRIPTORS[2];
    expect(parseWindGustFrameDescriptor(descriptor)).toEqual(descriptor);
    for (const invalid of [
      { ...descriptor, unexpected: true },
      { ...descriptor, isSimulated: false },
      { ...descriptor, operationalUse: true },
      { ...descriptor, unit: 'km' },
      { ...descriptor, minimum: -1 },
      { ...descriptor, maximum: 81 },
      { ...descriptor, valueDataUrl: '/media/../private.json' },
    ]) {
      expect(() => parseWindGustFrameDescriptor(invalid))
        .toThrow(WindGustValidationError);
    }
  });

  it('accepts exact grid boundaries 0 and 80 kt', () => {
    for (const value of [0, 80]) {
      const grid = createAviationScalarGridFixture('wind-gusts', TIMESTAMP, { value });
      expect(parseWindGustGrid(grid, TIMESTAMP).values[0]).toBe(value);
    }
  });

  it('rejects values outside 0–80 kt, null, wrong flags, and timestamp drift', () => {
    for (const value of [-0.1, 80.1, null]) {
      const grid = createAviationScalarGridFixture('wind-gusts', TIMESTAMP);
      grid.values[0] = value;
      expect(() => parseWindGustGrid(grid, TIMESTAMP)).toThrow();
    }
    const grid = createAviationScalarGridFixture('wind-gusts', TIMESTAMP);
    expect(() => parseWindGustGrid({ ...grid, operational_use: true }, TIMESTAMP))
      .toThrow();
    expect(() => parseWindGustGrid(grid, DEMO_TIMESTAMPS[3])).toThrow();
  });

  it('samples gust and wind at the same coordinate and timestamp', () => {
    const grid = parseWindGustGrid(
      createAviationScalarGridFixture('wind-gusts', TIMESTAMP, { value: 17.4 }),
      TIMESTAMP,
    );
    expect(sampleWindGustAtCoordinate({
      coordinate: [-74, 4],
      timestamp: TIMESTAMP,
      grid,
      wind: windField(12.34),
    })).toMatchObject({
      status: 'ready',
      value: 17.4,
      windSpeedKt: 12.3,
      unit: 'kt',
    });
  });

  it('accepts only the explicit 0.1 kt rounding tolerance', () => {
    expect(WIND_GUST_ROUNDING_TOLERANCE_KT).toBe(0.1);
    const grid = parseWindGustGrid(
      createAviationScalarGridFixture('wind-gusts', TIMESTAMP, { value: 9.9 }),
      TIMESTAMP,
    );
    expect(sampleWindGustAtCoordinate({
      coordinate: [-74, 4],
      timestamp: TIMESTAMP,
      grid,
      wind: windField(10),
    })).toMatchObject({ status: 'ready', value: 9.9, windSpeedKt: 10 });
  });

  it('marks gust lower than wind as unavailable without correcting it', () => {
    const grid = parseWindGustGrid(
      createAviationScalarGridFixture('wind-gusts', TIMESTAMP, { value: 9.8 }),
      TIMESTAMP,
    );
    expect(sampleWindGustAtCoordinate({
      coordinate: [-74, 4],
      timestamp: TIMESTAMP,
      grid,
      wind: windField(10),
    })).toMatchObject({ status: 'unavailable', message: 'Valor no disponible' });
  });

  it('rejects mixed timestamps and missing dependencies', () => {
    const grid = parseWindGustGrid(
      createAviationScalarGridFixture('wind-gusts', TIMESTAMP, { value: 20 }),
      TIMESTAMP,
    );
    expect(sampleWindGustAtCoordinate({
      coordinate: [-74, 4],
      timestamp: TIMESTAMP,
      grid,
      wind: windField(10, DEMO_TIMESTAMPS[3]),
    })).toMatchObject({ status: 'unavailable' });
    expect(sampleWindGustAtCoordinate({
      coordinate: [-74, 4],
      timestamp: TIMESTAMP,
      grid: null,
      wind: windField(10),
    })).toMatchObject({ status: 'unavailable' });
  });

  it('distinguishes coordinates outside coverage without clamping', () => {
    const grid = parseWindGustGrid(
      createAviationScalarGridFixture('wind-gusts', TIMESTAMP, { value: 20 }),
      TIMESTAMP,
    );
    expect(sampleWindGustAtCoordinate({
      coordinate: [-83, 4],
      timestamp: TIMESTAMP,
      grid,
      wind: windField(10),
    })).toMatchObject({ status: 'outside-coverage' });
  });

  it('samples injected grids without issuing marker-driven fetches', () => {
    const originalFetch = global.fetch;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as typeof fetch;
    try {
      const grid = parseWindGustGrid(
        createAviationScalarGridFixture('wind-gusts', TIMESTAMP, { value: 18 }),
        TIMESTAMP,
      );
      expect(sampleWindGustAtCoordinate({
        coordinate: [-74, 4],
        timestamp: TIMESTAMP,
        grid,
        wind: windField(10),
      })).toMatchObject({ status: 'ready' });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
