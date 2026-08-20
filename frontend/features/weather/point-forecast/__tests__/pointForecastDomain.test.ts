import {
  DEMO_TIMESTAMPS,
  type DemoTimestamp,
} from '@/features/airports';
import {
  AVIATION_LAYER_FRAME_DESCRIPTORS,
  AVIATION_LAYER_IDS,
  type AviationLayerFrameDescriptor,
  type AviationLayerId,
} from '@/features/weather/aviation-layer-contracts';

import {
  buildPointForecastSeries,
  createPointForecastDescriptorMap,
  PointForecastDescriptorError,
  PointForecastMinimumDataError,
  PointForecastSeriesLoader,
} from '..';
import {
  POINT_COORDINATE,
  SECOND_POINT_COORDINATE,
  createAviationMap,
  createCoreData,
  createCoreMap,
  createGrid,
} from './pointForecastTestFixtures';

const descriptorMap = createPointForecastDescriptorMap();

function successfulLoader(overrides: {
  loadCore?: jest.Mock;
  loadGrid?: jest.Mock;
} = {}) {
  const loadCore = overrides.loadCore ?? jest.fn(async (timestamp: DemoTimestamp) => (
    createCoreData(timestamp)
  ));
  const loadGrid = overrides.loadGrid ?? jest.fn(async (descriptor) => (
    createGrid(descriptor.layer, descriptor.timestamp)
  ));
  return {
    loadCore,
    loadGrid,
    loader: new PointForecastSeriesLoader({
      descriptorMap,
      loadCore,
      loadAviationGrid: loadGrid,
    }),
  };
}

describe('point forecast domain and series loader', () => {
  it('normalizes exactly four descriptors for each of six ordered timestamps', () => {
    expect(Object.keys(descriptorMap)).toEqual(DEMO_TIMESTAMPS);
    for (const timestamp of DEMO_TIMESTAMPS) {
      expect(Object.keys(descriptorMap[timestamp])).toEqual(AVIATION_LAYER_IDS);
    }
  });

  it('rejects missing, duplicated, or drifted descriptors', () => {
    const missing = AVIATION_LAYER_FRAME_DESCRIPTORS.slice(1);
    const duplicated = [
      ...AVIATION_LAYER_FRAME_DESCRIPTORS.slice(0, -1),
      AVIATION_LAYER_FRAME_DESCRIPTORS[0],
    ];
    const drifted = AVIATION_LAYER_FRAME_DESCRIPTORS.map((descriptor, index) => (
      index === 0 ? { ...descriptor, operationalUse: true as const } : descriptor
    ));
    expect(() => createPointForecastDescriptorMap(missing))
      .toThrow(PointForecastDescriptorError);
    expect(() => createPointForecastDescriptorMap(duplicated))
      .toThrow(PointForecastDescriptorError);
    expect(() => createPointForecastDescriptorMap(
      drifted as unknown as readonly AviationLayerFrameDescriptor[],
    ))
      .toThrow(PointForecastDescriptorError);
  });

  it('builds six synchronized samples with contractual rounding', () => {
    const series = buildPointForecastSeries({
      coordinate: POINT_COORDINATE,
      coreByTimestamp: createCoreMap(),
      aviationByLayer: createAviationMap(),
    });
    expect(series.points.map(({ timestamp }) => timestamp)).toEqual(DEMO_TIMESTAMPS);
    expect(series.points[0]).toMatchObject({
      temperatureC: 20,
      cloudCoverPct: 54.6,
      cloudBaseFtAgl: 3500,
      visibilityKm: 12.3,
      windGustKt: 27.9,
      isSimulated: true,
      operationalUse: false,
    });
    expect(Number.isInteger(series.points[0].windDirectionDeg)).toBe(true);
  });

  it('preserves a valid cloud-base null without marking the product unavailable', () => {
    const series = buildPointForecastSeries({
      coordinate: POINT_COORDINATE,
      coreByTimestamp: createCoreMap(),
      aviationByLayer: createAviationMap(DEMO_TIMESTAMPS[2]),
    });
    expect(series.points[2].cloudBaseFtAgl).toBeNull();
    expect(series.unavailableMetrics).toEqual([]);
  });

  it.each(AVIATION_LAYER_IDS)(
    'returns one coherent partial series when %s fails at any timestamp',
    async (failedLayer: AviationLayerId) => {
      const loadGrid = jest.fn(async (descriptor) => {
        if (descriptor.layer === failedLayer && descriptor.timestamp === DEMO_TIMESTAMPS[2]) {
          throw new Error('product unavailable');
        }
        return createGrid(descriptor.layer, descriptor.timestamp);
      });
      const { loader } = successfulLoader({ loadGrid });

      const result = await loader.loadCommittedCoordinate(POINT_COORDINATE);

      expect(result.status).toBe('partial');
      expect(result.series.unavailableMetrics).toEqual([failedLayer]);
      expect(result.series.points).toHaveLength(6);
      const fieldByLayer = {
        'cloud-cover': 'cloudCoverPct',
        'cloud-base': 'cloudBaseFtAgl',
        visibility: 'visibilityKm',
        'wind-gusts': 'windGustKt',
      } as const;
      expect(result.series.points.every(
        (point) => point[fieldByLayer[failedLayer]] === null,
      )).toBe(true);
    },
  );

  it('enters minimum-data error when the atomic temperature/wind series fails', async () => {
    const loadCore = jest.fn(async (timestamp: DemoTimestamp) => {
      if (timestamp === DEMO_TIMESTAMPS[3]) throw new Error('core unavailable');
      return createCoreData(timestamp);
    });
    const { loader } = successfulLoader({ loadCore });

    await expect(loader.loadCommittedCoordinate(POINT_COORDINATE))
      .rejects.toBeInstanceOf(PointForecastMinimumDataError);
  });

  it('rejects an external coordinate before starting any product request', async () => {
    const { loader, loadCore, loadGrid } = successfulLoader();

    await expect(loader.loadCommittedCoordinate([-83, 4]))
      .rejects.toBeInstanceOf(RangeError);
    expect(loadCore).not.toHaveBeenCalled();
    expect(loadGrid).not.toHaveBeenCalled();
  });

  it('deduplicates resolved products by layer/timestamp across the active loader', async () => {
    const { loader, loadCore, loadGrid } = successfulLoader();
    await loader.loadCommittedCoordinate(POINT_COORDINATE);
    await loader.loadCommittedCoordinate(SECOND_POINT_COORDINATE);

    expect(loadCore).toHaveBeenCalledTimes(6);
    expect(loadGrid).toHaveBeenCalledTimes(24);
  });

  it('does not cache a failed product and upgrades partial to ready on retry', async () => {
    let visibilityFailure = true;
    const loadGrid = jest.fn(async (descriptor) => {
      if (descriptor.layer === 'visibility' && visibilityFailure) {
        visibilityFailure = false;
        throw new Error('first visibility request fails');
      }
      return createGrid(descriptor.layer, descriptor.timestamp);
    });
    const { loader } = successfulLoader({ loadGrid });

    await expect(loader.loadCommittedCoordinate(POINT_COORDINATE))
      .resolves.toMatchObject({ status: 'partial' });
    await expect(loader.loadCommittedCoordinate(POINT_COORDINATE))
      .resolves.toMatchObject({ status: 'ready' });
  });

  it('lets coordinate B win when a signal-ignoring response for A resolves late', async () => {
    let resolveFirst!: (value: ReturnType<typeof createCoreData>) => void;
    const delayed = new Promise<ReturnType<typeof createCoreData>>((resolve) => {
      resolveFirst = resolve;
    });
    let firstRequest = true;
    const loadCore = jest.fn((timestamp: DemoTimestamp) => {
      if (timestamp === DEMO_TIMESTAMPS[0] && firstRequest) {
        firstRequest = false;
        return delayed;
      }
      return Promise.resolve(createCoreData(timestamp));
    });
    const { loader } = successfulLoader({ loadCore });
    const coordinateA = loader.loadCommittedCoordinate(POINT_COORDINATE);
    const coordinateB = loader.loadCommittedCoordinate(SECOND_POINT_COORDINATE);

    await expect(coordinateB).resolves.toMatchObject({
      status: 'ready',
      series: { coordinate: SECOND_POINT_COORDINATE },
    });
    resolveFirst(createCoreData(DEMO_TIMESTAMPS[0]));
    await expect(coordinateA).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('aborts active work and clears it when close is called', async () => {
    const loadCore = jest.fn((_timestamp: DemoTimestamp, { signal }) => (
      new Promise<never>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(
          new DOMException('aborted', 'AbortError'),
        ), { once: true });
      })
    ));
    const { loader } = successfulLoader({ loadCore });
    const loading = loader.loadCommittedCoordinate(POINT_COORDINATE);

    loader.close();

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('aborts active work on destroy, remains idempotent, and rejects later use', async () => {
    const loadCore = jest.fn((_timestamp: DemoTimestamp, { signal }) => (
      new Promise<never>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(
          new DOMException('aborted', 'AbortError'),
        ), { once: true });
      })
    ));
    const { loader } = successfulLoader({ loadCore });
    const loading = loader.loadCommittedCoordinate(POINT_COORDINATE);

    loader.destroy();
    loader.destroy();

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    await expect(loader.loadCommittedCoordinate(POINT_COORDINATE)).rejects.toThrow(
      'Cannot use a destroyed point forecast series loader.',
    );
  });
});
