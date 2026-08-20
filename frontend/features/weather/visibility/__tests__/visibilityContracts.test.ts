import { DEMO_TIMESTAMPS } from '@/features/airports';
import {
  AVIATION_BBOX,
  createAviationScalarGridFixture,
} from '@/features/weather/aviation-layer-contracts';
import {
  parseVisibilityFrameDescriptor,
  parseVisibilityGrid,
  sampleVisibilityAtCoordinate,
  VISIBILITY_FRAME_DESCRIPTORS,
  VISIBILITY_LEGEND,
  VISIBILITY_OPACITY,
  VisibilityValidationError,
} from '@/features/weather/visibility';

const TIMESTAMP = DEMO_TIMESTAMPS[2];

describe('visibility contracts and sampler', () => {
  it('publishes six exact descriptors, legend, unit, range, and opacity', () => {
    expect(VISIBILITY_FRAME_DESCRIPTORS).toHaveLength(6);
    expect(new Set(VISIBILITY_FRAME_DESCRIPTORS.map(({ timestamp }) => timestamp)))
      .toEqual(new Set(DEMO_TIMESTAMPS));
    expect(VISIBILITY_LEGEND).toMatchObject({
      title: 'Visibilidad simulada',
      unit: 'km',
      minimum: 1,
      maximum: 20,
    });
    expect(VISIBILITY_LEGEND.colorStops).toEqual([
      [1, '#d946efff'],
      [3, '#ef4444f2'],
      [5, '#f97316e6'],
      [10, '#facc15d9'],
      [15, '#22d3eeb8'],
      [20, '#1e3a8a80'],
    ]);
    expect(VISIBILITY_OPACITY).toBe(0.62);
  });

  it('parses a staged descriptor and rejects field, flag, unit, and range drift', () => {
    const descriptor = VISIBILITY_FRAME_DESCRIPTORS[2];
    expect(parseVisibilityFrameDescriptor(descriptor)).toEqual(descriptor);
    for (const invalid of [
      { ...descriptor, unexpected: true },
      { ...descriptor, isSimulated: false },
      { ...descriptor, operationalUse: true },
      { ...descriptor, unit: 'm' },
      { ...descriptor, minimum: 0 },
      { ...descriptor, maximum: 21 },
      { ...descriptor, imageUrl: 'https://weather.example/frame.webp' },
    ]) {
      expect(() => parseVisibilityFrameDescriptor(invalid))
        .toThrow(VisibilityValidationError);
    }
  });

  it('accepts exact grid boundaries 1 and 20 km', () => {
    for (const value of [1, 20]) {
      const grid = createAviationScalarGridFixture('visibility', TIMESTAMP, { value });
      expect(parseVisibilityGrid(grid, TIMESTAMP).values[0]).toBe(value);
    }
  });

  it('rejects values outside 1–20 km, null, wrong units, and timestamp drift', () => {
    for (const value of [0.9, 20.1, null]) {
      const grid = createAviationScalarGridFixture('visibility', TIMESTAMP);
      grid.values[0] = value;
      expect(() => parseVisibilityGrid(grid, TIMESTAMP)).toThrow();
    }
    const grid = createAviationScalarGridFixture('visibility', TIMESTAMP);
    expect(() => parseVisibilityGrid({ ...grid, unit: 'm' }, TIMESTAMP)).toThrow();
    expect(() => parseVisibilityGrid(grid, DEMO_TIMESTAMPS[3])).toThrow();
  });

  it('uses north-south/west-east bilinear interpolation and one decimal', () => {
    const raw = createAviationScalarGridFixture('visibility', TIMESTAMP, { value: 1 });
    raw.values[0] = 4;
    raw.values[1] = 8;
    raw.values[raw.width] = 12;
    raw.values[raw.width + 1] = 16;
    const grid = parseVisibilityGrid(raw, TIMESTAMP);
    const longitude = AVIATION_BBOX[0]
      + (AVIATION_BBOX[2] - AVIATION_BBOX[0]) * 0.5 / (grid.width - 1);
    const latitude = AVIATION_BBOX[3]
      - (AVIATION_BBOX[3] - AVIATION_BBOX[1]) * 0.5 / (grid.height - 1);

    expect(sampleVisibilityAtCoordinate({
      coordinate: [longitude, latitude],
      timestamp: TIMESTAMP,
      grid,
    })).toMatchObject({ status: 'ready', value: 10, unit: 'km' });
  });

  it('rounds interpolated values to one decimal', () => {
    const grid = parseVisibilityGrid(
      createAviationScalarGridFixture('visibility', TIMESTAMP, { value: 12.3 }),
      TIMESTAMP,
    );
    grid.values[0] = 12.3;
    grid.values[1] = 12.4;
    const longitude = AVIATION_BBOX[0]
      + (AVIATION_BBOX[2] - AVIATION_BBOX[0]) * 0.5 / (grid.width - 1);
    const sample = sampleVisibilityAtCoordinate({
      coordinate: [longitude, AVIATION_BBOX[3]],
      timestamp: TIMESTAMP,
      grid,
    });
    expect(sample).toMatchObject({ status: 'ready', value: 12.4 });
  });

  it('returns unavailable for missing or mismatched grids', () => {
    const grid = parseVisibilityGrid(
      createAviationScalarGridFixture('visibility', TIMESTAMP),
      TIMESTAMP,
    );
    expect(sampleVisibilityAtCoordinate({
      coordinate: [-74, 4],
      timestamp: TIMESTAMP,
      grid: null,
    })).toMatchObject({ status: 'unavailable', message: 'Valor no disponible' });
    expect(sampleVisibilityAtCoordinate({
      coordinate: [-74, 4],
      timestamp: DEMO_TIMESTAMPS[3],
      grid,
    })).toMatchObject({ status: 'unavailable', message: 'Valor no disponible' });
  });

  it('distinguishes coordinates outside the frozen bbox without clamping', () => {
    const grid = parseVisibilityGrid(
      createAviationScalarGridFixture('visibility', TIMESTAMP),
      TIMESTAMP,
    );
    expect(sampleVisibilityAtCoordinate({
      coordinate: [-83, 4],
      timestamp: TIMESTAMP,
      grid,
    })).toMatchObject({ status: 'outside-coverage' });
  });

  it('samples injected grids without issuing marker-driven fetches', () => {
    const originalFetch = global.fetch;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as typeof fetch;
    try {
      const grid = parseVisibilityGrid(
        createAviationScalarGridFixture('visibility', TIMESTAMP, { value: 8.4 }),
        TIMESTAMP,
      );
      expect(sampleVisibilityAtCoordinate({
        coordinate: [-74, 4],
        timestamp: TIMESTAMP,
        grid,
      })).toMatchObject({ status: 'ready', value: 8.4 });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
