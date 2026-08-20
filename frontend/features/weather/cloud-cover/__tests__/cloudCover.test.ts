import { DEMO_TIMESTAMPS } from '@/features/airports';
import {
  AVIATION_LAYER_DEFINITION_BY_ID,
  createAviationScalarGridFixture,
} from '@/features/weather/aviation-layer-contracts';
import {
  CLOUD_COVER_FRAME_DESCRIPTORS,
  CLOUD_COVER_LEGEND,
  CloudLayerValidationError,
  parseCloudCoverFrameDescriptor,
  parseCloudCoverScalarGrid,
  sampleCloudCoverAtCoordinate,
} from '@/features/weather/cloud-cover';

const descriptor = CLOUD_COVER_FRAME_DESCRIPTORS[2];

describe('cloud-cover contracts', () => {
  it('publishes six exact staged descriptors and the Phase 18 legend', () => {
    expect(CLOUD_COVER_FRAME_DESCRIPTORS).toHaveLength(6);
    expect(CLOUD_COVER_FRAME_DESCRIPTORS.map(({ timestamp }) => timestamp))
      .toEqual(DEMO_TIMESTAMPS);
    expect(CLOUD_COVER_LEGEND).toEqual({
      id: 'cloud-cover',
      title: 'Nubosidad simulada',
      unit: '%',
      minimum: 0,
      maximum: 100,
      opacity: 0.58,
      colorStops: AVIATION_LAYER_DEFINITION_BY_ID['cloud-cover'].colorStops,
      isSimulated: true,
      operationalUse: false,
    });
  });

  it('parses a valid descriptor without sharing its object', () => {
    const parsed = parseCloudCoverFrameDescriptor(descriptor);
    expect(parsed).toEqual(descriptor);
    expect(parsed).not.toBe(descriptor);
  });

  it('rejects descriptor field, unit, range, flags, layer, and paths drift', () => {
    const invalidCases = [
      { ...descriptor, unexpected: true },
      { ...descriptor, unit: 'okta' },
      { ...descriptor, minimum: -1 },
      { ...descriptor, maximum: 101 },
      { ...descriptor, isSimulated: false },
      { ...descriptor, operationalUse: true },
      { ...descriptor, layer: 'cloud-base' },
      { ...descriptor, imageUrl: 'https://weather.example/06Z.webp' },
      { ...descriptor, valueDataUrl: '/media/../private.json' },
    ];
    for (const invalid of invalidCases) {
      expect(() => parseCloudCoverFrameDescriptor(invalid))
        .toThrow(CloudLayerValidationError);
    }
  });

  it('parses a valid cover grid and rejects null values', () => {
    const valid = createAviationScalarGridFixture('cloud-cover', descriptor.timestamp, {
      value: 50,
    });
    expect(parseCloudCoverScalarGrid(valid, descriptor.timestamp)).toEqual(valid);
    valid.values[0] = null;
    expect(() => parseCloudCoverScalarGrid(valid, descriptor.timestamp))
      .toThrow(CloudLayerValidationError);
  });

  it('rejects a grid with mismatched timestamp, range, unit, or flags', () => {
    const valid = createAviationScalarGridFixture('cloud-cover', descriptor.timestamp);
    const invalidCases = [
      { ...valid, timestamp: DEMO_TIMESTAMPS[3] },
      { ...valid, unit: 'okta' },
      { ...valid, is_simulated: false },
      { ...valid, operational_use: true },
      { ...valid, values: [...valid.values.slice(0, -1), 101] },
    ];
    for (const invalid of invalidCases) {
      expect(() => parseCloudCoverScalarGrid(invalid, descriptor.timestamp))
        .toThrow(CloudLayerValidationError);
    }
  });

  it('samples bilinearly and rounds cover to one decimal', () => {
    const grid = createAviationScalarGridFixture('cloud-cover', descriptor.timestamp, {
      value: 20,
    });
    grid.values[0] = 20;
    grid.values[1] = 21;
    grid.values[grid.width] = 20;
    grid.values[grid.width + 1] = 21;
    const longitude = grid.bbox[0]
      + (grid.bbox[2] - grid.bbox[0]) * 0.34 / (grid.width - 1);
    const latitude = grid.bbox[3]
      - (grid.bbox[3] - grid.bbox[1]) * 0.5 / (grid.height - 1);
    const parsed = parseCloudCoverScalarGrid(grid, descriptor.timestamp);
    expect(sampleCloudCoverAtCoordinate(parsed, [longitude, latitude])).toBe(20.3);
  });
});
