import {
  ISOBAR_BBOX,
  ISOBAR_DATA_URLS,
  ISOBAR_OVERLAY_ID,
  ISOBAR_OVERLAY_NAME,
  ISOBAR_PRESSURE_LEVELS,
  ISOBAR_SCENARIO,
  ISOBAR_TIMESTAMPS,
  ISOBAR_UNIT,
  expectedIsobarFrame,
} from './constants';
import type {
  IsobarFeatureCollection,
  IsobarFrame,
  IsobarPressureHpa,
  IsobarTimestamp,
} from './types';

export class IsobarValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IsobarValidationError';
  }
}

function fail(message: string): never {
  throw new IsobarValidationError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

export function isIsobarTimestamp(value: unknown): value is IsobarTimestamp {
  return typeof value === 'string'
    && (ISOBAR_TIMESTAMPS as readonly string[]).includes(value);
}

export function requireIsobarTimestamp(value: unknown): IsobarTimestamp {
  if (!isIsobarTimestamp(value)) fail('Isobar timestamp is outside the frozen catalog.');
  return value;
}

function isPressureLevel(value: unknown): value is IsobarPressureHpa {
  return Number.isInteger(value)
    && (ISOBAR_PRESSURE_LEVELS as readonly unknown[]).includes(value);
}

export function assertIsobarFrame(frame: IsobarFrame): void {
  if (
    frame.id !== ISOBAR_OVERLAY_ID
    || !isIsobarTimestamp(frame.timestamp)
    || frame.unit !== ISOBAR_UNIT
    || frame.dataUrl !== ISOBAR_DATA_URLS[frame.timestamp]
    || frame.isSimulated !== true
    || frame.operationalUse !== false
  ) {
    fail('Isobar frame does not match the frozen contract.');
  }
}

export function parseIsobarCatalogResponse(value: unknown): readonly IsobarFrame[] {
  if (!isRecord(value) || !isRecord(value.scenario)) {
    fail('Isobar catalog must contain a scenario object.');
  }
  if (
    value.scenario.code !== ISOBAR_SCENARIO
    || value.scenario.is_simulated !== true
    || value.scenario.operational_use !== false
  ) {
    fail('Isobar catalog scenario is invalid.');
  }
  if (!Array.isArray(value.overlays) || value.overlays.length !== 1) {
    fail('Isobar catalog overlays are invalid.');
  }
  const overlay = value.overlays[0];
  if (
    !isRecord(overlay)
    || !hasExactKeys(overlay, ['id', 'name', 'unit', 'frames'])
    || overlay.id !== ISOBAR_OVERLAY_ID
    || overlay.name !== ISOBAR_OVERLAY_NAME
    || overlay.unit !== ISOBAR_UNIT
    || !Array.isArray(overlay.frames)
    || overlay.frames.length !== ISOBAR_TIMESTAMPS.length
  ) {
    fail('Isobar overlay descriptor is invalid.');
  }

  return Object.freeze(overlay.frames.map((candidate, index) => {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ['timestamp', 'data_url'])) {
      fail('Isobar catalog frame is invalid.');
    }
    const timestamp = requireIsobarTimestamp(candidate.timestamp);
    if (
      timestamp !== ISOBAR_TIMESTAMPS[index]
      || candidate.data_url !== ISOBAR_DATA_URLS[timestamp]
    ) {
      fail('Isobar catalog frame does not preserve the frozen order and path.');
    }
    return expectedIsobarFrame(timestamp);
  }));
}

export function selectIsobarFrame(
  frames: readonly IsobarFrame[],
  timestamp: string,
): IsobarFrame {
  const requestedTimestamp = requireIsobarTimestamp(timestamp);
  const frame = frames.find((candidate) => candidate.timestamp === requestedTimestamp);
  if (!frame) fail('Isobar frame is missing from the frozen catalog.');
  assertIsobarFrame(frame);
  return frame;
}

export function parseIsobarFeatureCollection(
  value: unknown,
  expectedTimestamp: IsobarTimestamp,
): IsobarFeatureCollection {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ['type', 'features'])
    || value.type !== 'FeatureCollection'
    || !Array.isArray(value.features)
    || value.features.length === 0
  ) {
    fail('Isobar GeoJSON collection is invalid.');
  }
  const observedLevels = new Set<IsobarPressureHpa>();
  for (const feature of value.features) {
    if (
      !isRecord(feature)
      || !hasExactKeys(feature, ['type', 'properties', 'geometry'])
      || feature.type !== 'Feature'
      || !isRecord(feature.properties)
      || !hasExactKeys(feature.properties, [
        'pressure_hpa',
        'timestamp',
        'is_simulated',
        'operational_use',
      ])
      || !isPressureLevel(feature.properties.pressure_hpa)
      || feature.properties.timestamp !== expectedTimestamp
      || feature.properties.is_simulated !== true
      || feature.properties.operational_use !== false
      || !isRecord(feature.geometry)
      || !hasExactKeys(feature.geometry, ['type', 'coordinates'])
      || feature.geometry.type !== 'LineString'
      || !Array.isArray(feature.geometry.coordinates)
      || feature.geometry.coordinates.length < 2
    ) {
      fail('Isobar GeoJSON feature is invalid.');
    }
    observedLevels.add(feature.properties.pressure_hpa);
    const distinctCoordinates = new Set<string>();
    for (const coordinate of feature.geometry.coordinates) {
      if (
        !Array.isArray(coordinate)
        || coordinate.length !== 2
        || typeof coordinate[0] !== 'number'
        || typeof coordinate[1] !== 'number'
        || !Number.isFinite(coordinate[0])
        || !Number.isFinite(coordinate[1])
        || coordinate[0] < ISOBAR_BBOX[0]
        || coordinate[0] > ISOBAR_BBOX[2]
        || coordinate[1] < ISOBAR_BBOX[1]
        || coordinate[1] > ISOBAR_BBOX[3]
      ) {
        fail('Isobar GeoJSON coordinate is invalid.');
      }
      distinctCoordinates.add(`${coordinate[0]},${coordinate[1]}`);
    }
    if (distinctCoordinates.size < 2) fail('Isobar LineString is degenerate.');
  }
  if (
    observedLevels.size !== ISOBAR_PRESSURE_LEVELS.length
    || ISOBAR_PRESSURE_LEVELS.some((level) => !observedLevels.has(level))
  ) {
    fail('Isobar GeoJSON pressure levels are incomplete.');
  }
  return value as unknown as IsobarFeatureCollection;
}
