import { DEMO_TIMESTAMPS, type DemoTimestamp } from '@/features/airports';
import {
  AVIATION_BBOX,
  AVIATION_GRID_VALUE_COUNT,
  AVIATION_LAYER_DEFINITION_BY_ID,
  AVIATION_LAYER_FRAME_DESCRIPTORS,
  AVIATION_LAYER_IDS,
  AVIATION_MANIFEST_FRAME_FRAGMENT,
  AviationLayerValidationError,
  createAviationScalarGridFixture,
  parseAviationLayerFrameDescriptor,
  parseAviationScalarGrid,
  sampleAviationScalarGrid,
  type AviationLayerId,
  type AviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';

function rawFrame(layer: AviationLayerId, timestamp: DemoTimestamp) {
  const descriptor = AVIATION_LAYER_FRAME_DESCRIPTORS.find(
    (candidate) => candidate.layer === layer && candidate.timestamp === timestamp,
  );
  if (!descriptor) throw new Error('Missing staged descriptor.');
  return {
    scenario: 'demo-colombia-001',
    layer,
    timestamp,
    unit: descriptor.unit,
    is_simulated: true,
    operational_use: false,
    coverage: { west: -82, south: -5, east: -66, north: 14 },
    minimum: descriptor.minimum,
    maximum: descriptor.maximum,
    data_url: descriptor.imageUrl,
    value_data_url: descriptor.valueDataUrl,
  };
}

describe('staged aviation-layer contracts', () => {
  it('exports four products and 24 timestamp-major descriptors', () => {
    expect(AVIATION_LAYER_IDS).toEqual([
      'cloud-cover',
      'cloud-base',
      'visibility',
      'wind-gusts',
    ]);
    expect(AVIATION_LAYER_FRAME_DESCRIPTORS).toHaveLength(24);
    expect(AVIATION_LAYER_FRAME_DESCRIPTORS.slice(0, 4).map(({ layer }) => layer))
      .toEqual(AVIATION_LAYER_IDS);
    expect(new Set(AVIATION_LAYER_FRAME_DESCRIPTORS.map(({ timestamp }) => timestamp)))
      .toEqual(new Set(DEMO_TIMESTAMPS));
  });

  it('parses a valid grid for every layer without sharing its values array', () => {
    for (const layer of AVIATION_LAYER_IDS) {
      const fixture = createAviationScalarGridFixture(layer);
      const parsed = parseAviationScalarGrid(fixture, layer, fixture.timestamp);
      expect(parsed).toEqual(fixture);
      expect(parsed.values).not.toBe(fixture.values);
    }
  });

  it('rejects metadata, shape, flags, units, and extra fields', () => {
    const valid = createAviationScalarGridFixture('visibility');
    const invalidCases = [
      { ...valid, width: 64 },
      { ...valid, height: 80 },
      { ...valid, bbox: [-81, -5, -66, 14] },
      { ...valid, unit: 'm' },
      { ...valid, is_simulated: false },
      { ...valid, operational_use: true },
      { ...valid, values: [10] },
      { ...valid, unexpected: true },
    ];
    for (const invalid of invalidCases) {
      expect(() => parseAviationScalarGrid(invalid, 'visibility', valid.timestamp))
        .toThrow(AviationLayerValidationError);
    }
  });

  it('rejects NaN, infinity, range drift, and null outside cloud-base', () => {
    for (const invalidValue of [Number.NaN, Number.POSITIVE_INFINITY, 21, null]) {
      const fixture = createAviationScalarGridFixture('visibility');
      fixture.values[0] = invalidValue;
      expect(() => parseAviationScalarGrid(fixture, 'visibility', fixture.timestamp))
        .toThrow(AviationLayerValidationError);
    }
  });

  it('accepts cloud-base null but enforces 100 ft increments', () => {
    const fixture = createAviationScalarGridFixture('cloud-base', DEMO_TIMESTAMPS[2], {
      nullIndexes: [0],
    });
    expect(parseAviationScalarGrid(fixture, 'cloud-base', fixture.timestamp).values[0])
      .toBeNull();
    fixture.values[1] = 3050;
    expect(() => parseAviationScalarGrid(fixture, 'cloud-base', fixture.timestamp))
      .toThrow(AviationLayerValidationError);
  });

  it('parses every staged API descriptor with exact safe same-origin URLs', () => {
    for (const descriptor of AVIATION_LAYER_FRAME_DESCRIPTORS) {
      expect(parseAviationLayerFrameDescriptor(
        rawFrame(descriptor.layer, descriptor.timestamp),
        descriptor.layer,
        descriptor.timestamp,
      )).toEqual(descriptor);
    }
  });

  it('rejects external, traversal, flag, range, and timestamp descriptor drift', () => {
    const timestamp = DEMO_TIMESTAMPS[2];
    const valid = rawFrame('cloud-cover', timestamp);
    const invalidCases = [
      { ...valid, data_url: 'https://weather.example/frame.webp' },
      { ...valid, value_data_url: '/media/../private.json' },
      { ...valid, operational_use: true },
      { ...valid, minimum: -1 },
      { ...valid, timestamp: DEMO_TIMESTAMPS[1] },
    ];
    for (const invalid of invalidCases) {
      expect(() => parseAviationLayerFrameDescriptor(invalid, 'cloud-cover', timestamp))
        .toThrow(AviationLayerValidationError);
    }
  });

  it('publishes the exact Phase 23 manifest fragment without flags or URLs', () => {
    expect(AVIATION_MANIFEST_FRAME_FRAGMENT).toHaveLength(24);
    for (const descriptor of AVIATION_MANIFEST_FRAME_FRAGMENT) {
      expect(Object.keys(descriptor).sort()).toEqual([
        'data_path',
        'layer',
        'maximum',
        'minimum',
        'timestamp',
        'value_data_path',
      ]);
      expect(descriptor.data_path).toMatch(
        /^demo-weather\/demo-colombia-001\/(cloud-cover|cloud-base|visibility|wind-gusts)\/(00|03|06|09|12|15)Z\.webp$/,
      );
      expect(descriptor.value_data_path).toMatch(/-values\/(00|03|06|09|12|15)Z\.json$/);
    }
  });

  it('samples a constant row-major grid at boundaries and interior coordinates', () => {
    const fixture = createAviationScalarGridFixture('visibility', DEMO_TIMESTAMPS[2], {
      value: 12.4,
    });
    expect(sampleAviationScalarGrid(fixture, [-82, 14])).toBe(12.4);
    expect(sampleAviationScalarGrid(fixture, [-66, -5])).toBe(12.4);
    expect(sampleAviationScalarGrid(fixture, [-74, 4.5])).toBeCloseTo(12.4, 8);
  });

  it('uses north-south/west-east row-major bilinear interpolation', () => {
    const fixture = createAviationScalarGridFixture('visibility', DEMO_TIMESTAMPS[2], {
      value: 1,
    });
    fixture.values[0] = 4;
    fixture.values[1] = 8;
    fixture.values[fixture.width] = 12;
    fixture.values[fixture.width + 1] = 16;
    const longitude = AVIATION_BBOX[0]
      + (AVIATION_BBOX[2] - AVIATION_BBOX[0]) * 0.5 / (fixture.width - 1);
    const latitude = AVIATION_BBOX[3]
      - (AVIATION_BBOX[3] - AVIATION_BBOX[1]) * 0.5 / (fixture.height - 1);
    expect(sampleAviationScalarGrid(fixture, [longitude, latitude])).toBeCloseTo(10, 8);
  });

  it('propagates cloud-base null and rejects it under the strict policy', () => {
    const fixture = createAviationScalarGridFixture('cloud-base', DEMO_TIMESTAMPS[2], {
      nullIndexes: [0],
    });
    expect(sampleAviationScalarGrid(fixture, [-82, 14])).toBeNull();
    expect(() => sampleAviationScalarGrid(fixture, [-82, 14], 'reject'))
      .toThrow(TypeError);
  });

  it('rejects coordinates outside coverage or with non-finite components', () => {
    const fixture = createAviationScalarGridFixture('cloud-cover');
    for (const coordinate of [[-83, 4], [-74, 15], [Number.NaN, 4]] as const) {
      expect(() => sampleAviationScalarGrid(fixture, coordinate)).toThrow(RangeError);
    }
  });

  it('creates fixtures with exact units, ranges, and 20,480 values', () => {
    for (const layer of AVIATION_LAYER_IDS) {
      const fixture: AviationScalarGrid = createAviationScalarGridFixture(layer);
      const definition = AVIATION_LAYER_DEFINITION_BY_ID[layer];
      expect(fixture.unit).toBe(definition.unit);
      expect(fixture.values).toHaveLength(AVIATION_GRID_VALUE_COUNT);
      expect(fixture.bbox).toEqual(AVIATION_BBOX);
      expect(fixture.is_simulated).toBe(true);
      expect(fixture.operational_use).toBe(false);
    }
  });
});
