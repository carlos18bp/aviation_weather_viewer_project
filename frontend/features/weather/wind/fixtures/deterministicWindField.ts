import {
  WIND_FIELD_BBOX,
  WIND_FIELD_HEIGHT,
  WIND_FIELD_WIDTH,
  WIND_TIMESTAMPS,
  type WindTimestamp,
} from '../constants';
import type { WindField } from '../types';

const TWO_PI = Math.PI * 2;

function roundWindComponent(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function freezeValues(values: number[]): number[] {
  return Object.freeze(values) as unknown as number[];
}

export function createDeterministicWindField(
  timestamp: WindTimestamp = '2026-01-15T06:00:00Z',
): WindField {
  const timestampIndex = WIND_TIMESTAMPS.indexOf(timestamp);

  if (timestampIndex < 0) {
    throw new RangeError(`Unsupported deterministic wind timestamp: ${timestamp}`);
  }

  const phase = (timestampIndex / WIND_TIMESTAMPS.length) * TWO_PI;
  const u: number[] = [];
  const v: number[] = [];

  for (let row = 0; row < WIND_FIELD_HEIGHT; row += 1) {
    const northToSouth = row / (WIND_FIELD_HEIGHT - 1);
    const latitudeWave = northToSouth * Math.PI;

    for (let column = 0; column < WIND_FIELD_WIDTH; column += 1) {
      const westToEast = column / (WIND_FIELD_WIDTH - 1);
      const longitudeWave = westToEast * TWO_PI;
      const eastward =
        13 +
        7 * Math.cos(latitudeWave + phase * 0.55) +
        4 * Math.sin(longitudeWave * 1.35 - phase);
      const northward =
        2 +
        8 * Math.sin(longitudeWave - phase * 0.7) *
          Math.cos(latitudeWave * 0.8 + phase * 0.25);

      u.push(roundWindComponent(eastward));
      v.push(roundWindComponent(northward));
    }
  }

  return Object.freeze({
    scenario: 'demo-colombia-001',
    width: WIND_FIELD_WIDTH,
    height: WIND_FIELD_HEIGHT,
    bbox: Object.freeze([...WIND_FIELD_BBOX]) as WindField['bbox'],
    unit: 'kt',
    timestamp,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    u: freezeValues(u),
    v: freezeValues(v),
  });
}

export const WIND_FIELD_FIXTURE = createDeterministicWindField();
