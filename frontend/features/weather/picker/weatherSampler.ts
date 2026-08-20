import type { DemoTimestamp } from '@/features/airports';
import type { WindField } from '@/features/weather/wind';
import { sampleWindField } from '@/map/renderers/wind';

import { WEATHER_PICKER_BBOX } from './constants';
import type {
  Coordinate,
  TemperatureValueGrid,
  WeatherSampleResult,
} from './types';

function lerp(start: number, end: number, weight: number): number {
  return start + (end - start) * weight;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function meteorologicalDirection(u: number, v: number): number {
  if (u === 0 && v === 0) {
    return 0;
  }
  const rawDirection = Math.atan2(-u, -v) * (180 / Math.PI);
  const normalized = ((rawDirection % 360) + 360) % 360;
  return Math.round(normalized) % 360;
}

export function isCoordinateInsideCoverage(coordinate: Coordinate): boolean {
  const [longitude, latitude] = coordinate;
  const [west, south, east, north] = WEATHER_PICKER_BBOX;
  return Number.isFinite(longitude)
    && Number.isFinite(latitude)
    && longitude >= west
    && longitude <= east
    && latitude >= south
    && latitude <= north;
}

export function sampleScalarGrid(
  grid: TemperatureValueGrid,
  coordinate: Coordinate,
): number {
  if (!isCoordinateInsideCoverage(coordinate)) {
    throw new RangeError('Coordinate is outside the frozen weather coverage.');
  }

  const [longitude, latitude] = coordinate;
  const [west, south, east, north] = grid.bbox;
  const gridX = ((longitude - west) / (east - west)) * (grid.width - 1);
  const gridY = ((north - latitude) / (north - south)) * (grid.height - 1);
  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const x1 = Math.min(x0 + 1, grid.width - 1);
  const y1 = Math.min(y0 + 1, grid.height - 1);
  const weightX = gridX - x0;
  const weightY = gridY - y0;
  const sample = (x: number, y: number) => grid.values[y * grid.width + x];
  const northValue = lerp(sample(x0, y0), sample(x1, y0), weightX);
  const southValue = lerp(sample(x0, y1), sample(x1, y1), weightX);
  return lerp(northValue, southValue, weightY);
}

function fieldsMatchTimestamp(
  timestamp: DemoTimestamp,
  temperature: TemperatureValueGrid,
  wind: WindField,
): boolean {
  return temperature.timestamp === timestamp
    && wind.timestamp === timestamp
    && temperature.is_simulated === true
    && temperature.operational_use === false
    && wind.is_simulated === true
    && wind.operational_use === false;
}

export function sampleWeatherAtCoordinate(input: {
  coordinate: Coordinate;
  timestamp: DemoTimestamp;
  temperature: TemperatureValueGrid;
  wind: WindField;
}): WeatherSampleResult {
  const coordinate: Coordinate = [...input.coordinate];
  if (!isCoordinateInsideCoverage(coordinate)) {
    return { status: 'outside-coverage', coordinate };
  }
  if (!fieldsMatchTimestamp(input.timestamp, input.temperature, input.wind)) {
    return { status: 'unavailable', coordinate, message: 'Datos no disponibles' };
  }

  try {
    const temperatureC = sampleScalarGrid(input.temperature, coordinate);
    const wind = sampleWindField(input.wind, coordinate[0], coordinate[1]);
    if (![temperatureC, wind.u, wind.v, wind.speed].every(Number.isFinite)) {
      return { status: 'unavailable', coordinate, message: 'Datos no disponibles' };
    }
    return {
      status: 'ready',
      sample: {
        coordinate,
        timestamp: input.timestamp,
        temperatureC: roundToOneDecimal(temperatureC),
        windSpeedKt: roundToOneDecimal(wind.speed),
        windDirectionDeg: meteorologicalDirection(wind.u, wind.v),
        is_simulated: true,
        operational_use: false,
      },
    };
  } catch {
    return { status: 'unavailable', coordinate, message: 'Datos no disponibles' };
  }
}
