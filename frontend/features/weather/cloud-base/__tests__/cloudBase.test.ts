import { DEMO_TIMESTAMPS } from '@/features/airports';
import {
  AVIATION_LAYER_DEFINITION_BY_ID,
  createAviationScalarGridFixture,
} from '@/features/weather/aviation-layer-contracts';
import {
  CLOUD_BASE_FRAME_DESCRIPTORS,
  CLOUD_BASE_LEGEND,
  CLOUD_BASE_NULL_COPY,
  parseCloudBaseFrameDescriptor,
  parseCloudBaseScalarGrid,
  sampleCloudBaseAtCoordinate,
} from '@/features/weather/cloud-base';
import { CloudLayerValidationError } from '@/features/weather/cloud-cover';

const descriptor = CLOUD_BASE_FRAME_DESCRIPTORS[2];

describe('cloud-base contracts', () => {
  it('publishes six exact staged descriptors and the null-aware legend', () => {
    expect(CLOUD_BASE_FRAME_DESCRIPTORS).toHaveLength(6);
    expect(CLOUD_BASE_FRAME_DESCRIPTORS.map(({ timestamp }) => timestamp))
      .toEqual(DEMO_TIMESTAMPS);
    expect(CLOUD_BASE_LEGEND).toEqual({
      id: 'cloud-base',
      title: 'Base de nubes simulada',
      unit: 'ft AGL',
      minimum: 300,
      maximum: 15000,
      opacity: 0.64,
      colorStops: AVIATION_LAYER_DEFINITION_BY_ID['cloud-base'].colorStops,
      isSimulated: true,
      operationalUse: false,
      nullCopy: 'Sin base significativa en este punto simulado',
    });
    expect(CLOUD_BASE_NULL_COPY)
      .toBe('Sin base significativa en este punto simulado');
  });

  it('parses a valid descriptor and rejects contract drift', () => {
    expect(parseCloudBaseFrameDescriptor(descriptor)).toEqual(descriptor);
    for (const invalid of [
      { ...descriptor, unit: 'ft' },
      { ...descriptor, minimum: 0 },
      { ...descriptor, maximum: 16000 },
      { ...descriptor, isSimulated: false },
      { ...descriptor, operationalUse: true },
      { ...descriptor, imageUrl: '//external.example/base.webp' },
    ]) {
      expect(() => parseCloudBaseFrameDescriptor(invalid))
        .toThrow(CloudLayerValidationError);
    }
  });

  it('accepts valid null cells but rejects invalid increments', () => {
    const grid = createAviationScalarGridFixture('cloud-base', descriptor.timestamp, {
      nullIndexes: [0],
    });
    expect(parseCloudBaseScalarGrid(grid, descriptor.timestamp).values[0]).toBeNull();
    grid.values[1] = 3050;
    expect(() => parseCloudBaseScalarGrid(grid, descriptor.timestamp))
      .toThrow(CloudLayerValidationError);
  });

  it('propagates null when any interpolation neighbor has no base', () => {
    const grid = createAviationScalarGridFixture('cloud-base', descriptor.timestamp, {
      value: 3000,
      nullIndexes: [0],
    });
    const parsed = parseCloudBaseScalarGrid(grid, descriptor.timestamp);
    expect(sampleCloudBaseAtCoordinate(parsed, [-82, 14])).toBeNull();
    expect(parsed.values).toHaveLength(128 * 160);
  });

  it('samples bilinearly and rounds base to one hundred feet', () => {
    const grid = createAviationScalarGridFixture('cloud-base', descriptor.timestamp, {
      value: 3000,
    });
    grid.values[0] = 3000;
    grid.values[1] = 3100;
    grid.values[grid.width] = 3000;
    grid.values[grid.width + 1] = 3100;
    const longitude = grid.bbox[0]
      + (grid.bbox[2] - grid.bbox[0]) * 0.6 / (grid.width - 1);
    const latitude = grid.bbox[3]
      - (grid.bbox[3] - grid.bbox[1]) * 0.5 / (grid.height - 1);
    const parsed = parseCloudBaseScalarGrid(grid, descriptor.timestamp);
    expect(sampleCloudBaseAtCoordinate(parsed, [longitude, latitude])).toBe(3100);
  });

  it('rejects cloud-cover input and timestamp mismatch', () => {
    const wrongLayer = createAviationScalarGridFixture('cloud-cover', descriptor.timestamp);
    const wrongTimestamp = createAviationScalarGridFixture(
      'cloud-base',
      DEMO_TIMESTAMPS[3],
    );
    expect(() => parseCloudBaseScalarGrid(wrongLayer, descriptor.timestamp))
      .toThrow(CloudLayerValidationError);
    expect(() => parseCloudBaseScalarGrid(wrongTimestamp, descriptor.timestamp))
      .toThrow(CloudLayerValidationError);
  });
});
