import type { DemoTimestamp } from '@/features/airports';
import {
  AVIATION_BBOX,
  sampleAviationScalarGrid,
  type AviationCoordinate,
} from '@/features/weather/aviation-layer-contracts';
import type { WindField } from '@/features/weather/wind';
import { sampleWindField } from '@/map/renderers/wind';

import {
  WIND_GUST_ROUNDING_TOLERANCE_KT,
  WIND_GUST_VALUE_UNAVAILABLE,
} from './constants';
import type { WindGustGrid, WindGustSampleResult } from './types';

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function insideCoverage(coordinate: AviationCoordinate): boolean {
  const [longitude, latitude] = coordinate;
  return Number.isFinite(longitude)
    && Number.isFinite(latitude)
    && longitude >= AVIATION_BBOX[0]
    && longitude <= AVIATION_BBOX[2]
    && latitude >= AVIATION_BBOX[1]
    && latitude <= AVIATION_BBOX[3];
}

function inputsMatchTimestamp(
  grid: WindGustGrid,
  wind: WindField,
  timestamp: DemoTimestamp,
): boolean {
  return grid.layer === 'wind-gusts'
    && grid.unit === 'kt'
    && grid.timestamp === timestamp
    && wind.timestamp === timestamp
    && grid.is_simulated === true
    && grid.operational_use === false
    && wind.is_simulated === true
    && wind.operational_use === false;
}

function unavailable(
  coordinate: AviationCoordinate,
  timestamp: DemoTimestamp,
): WindGustSampleResult {
  return {
    status: 'unavailable',
    coordinate,
    timestamp,
    message: WIND_GUST_VALUE_UNAVAILABLE,
  };
}

export function sampleWindGustAtCoordinate(input: {
  coordinate: AviationCoordinate;
  timestamp: DemoTimestamp;
  grid: WindGustGrid | null;
  wind: WindField | null;
}): WindGustSampleResult {
  const coordinate: AviationCoordinate = [...input.coordinate];
  if (!insideCoverage(coordinate)) {
    return { status: 'outside-coverage', coordinate, timestamp: input.timestamp };
  }
  if (
    !input.grid
    || !input.wind
    || !inputsMatchTimestamp(input.grid, input.wind, input.timestamp)
  ) {
    return unavailable(coordinate, input.timestamp);
  }
  try {
    const gust = sampleAviationScalarGrid(input.grid, coordinate, 'reject');
    const wind = sampleWindField(input.wind, coordinate[0], coordinate[1]);
    if (
      gust === null
      || !Number.isFinite(gust)
      || !Number.isFinite(wind.speed)
      || gust < 0
      || gust > 80
      || gust + WIND_GUST_ROUNDING_TOLERANCE_KT < wind.speed
    ) {
      return unavailable(coordinate, input.timestamp);
    }
    return {
      status: 'ready',
      coordinate,
      timestamp: input.timestamp,
      value: roundToOneDecimal(gust),
      windSpeedKt: roundToOneDecimal(wind.speed),
      unit: 'kt',
      isSimulated: true,
      operationalUse: false,
    };
  } catch {
    return unavailable(coordinate, input.timestamp);
  }
}
