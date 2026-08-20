import type { DemoTimestamp } from '@/features/airports';
import type {
  TemperatureValueGrid,
} from '@/features/weather/picker';
import {
  isCoordinateInsideCoverage,
  sampleScalarGrid,
  sampleWeatherAtCoordinate,
} from '@/features/weather/picker';
import type { WindField } from '@/features/weather/wind';

const TIMESTAMP: DemoTimestamp = '2026-01-15T06:00:00Z';

function scalarGrid(values = [10, 20, 30, 40]): TemperatureValueGrid {
  return {
    scenario: 'demo-colombia-001',
    layer: 'temperature',
    width: 2,
    height: 2,
    bbox: [-82, -5, -66, 14],
    unit: '°C',
    timestamp: TIMESTAMP,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    values,
  } as unknown as TemperatureValueGrid;
}

function windField(u = 10, v = 0): WindField {
  return {
    scenario: 'demo-colombia-001',
    width: 2,
    height: 2,
    bbox: [-82, -5, -66, 14],
    unit: 'kt',
    timestamp: TIMESTAMP,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    u: [u, u, u, u],
    v: [v, v, v, v],
  } as unknown as WindField;
}

describe('weather coordinate sampler', () => {
  it.each([
    [[-82, -5], true],
    [[-66, 14], true],
    [[-82.01, 4], false],
    [[-74, 14.01], false],
    [[Number.NaN, 4], false],
  ] as const)('classifies the frozen bbox for %p', (coordinate, expected) => {
    expect(isCoordinateInsideCoverage(coordinate)).toBe(expected);
  });

  it('samples exact corners and edges without exceeding the grid', () => {
    const grid = scalarGrid();

    expect(sampleScalarGrid(grid, [-82, 14])).toBe(10);
    expect(sampleScalarGrid(grid, [-66, -5])).toBe(40);
    expect(sampleScalarGrid(grid, [-74, 14])).toBe(15);
  });

  it('interpolates a scalar bilinearly at cell center', () => {
    expect(sampleScalarGrid(scalarGrid(), [-74, 4.5])).toBe(25);
  });

  it('rejects direct scalar sampling outside the frozen bbox', () => {
    expect(() => sampleScalarGrid(scalarGrid(), [-83, 4])).toThrow(RangeError);
  });

  it('returns rounded temperature, speed, and meteorological direction', () => {
    const result = sampleWeatherAtCoordinate({
      coordinate: [-74, 4.5],
      timestamp: TIMESTAMP,
      temperature: scalarGrid(),
      wind: windField(10, 0),
    });

    expect(result).toEqual({
      status: 'ready',
      sample: {
        coordinate: [-74, 4.5],
        timestamp: TIMESTAMP,
        temperatureC: 25,
        windSpeedKt: 10,
        windDirectionDeg: 270,
        is_simulated: true,
        operational_use: false,
      },
    });
  });

  it('distinguishes an outside point before using clamped wind sampling', () => {
    expect(sampleWeatherAtCoordinate({
      coordinate: [-83, 4],
      timestamp: TIMESTAMP,
      temperature: scalarGrid(),
      wind: windField(),
    })).toEqual({ status: 'outside-coverage', coordinate: [-83, 4] });
  });

  it('returns unavailable for mixed timestamps', () => {
    const temperature = scalarGrid();
    temperature.timestamp = '2026-01-15T03:00:00Z';

    expect(sampleWeatherAtCoordinate({
      coordinate: [-74, 4],
      timestamp: TIMESTAMP,
      temperature,
      wind: windField(),
    })).toEqual({
      status: 'unavailable',
      coordinate: [-74, 4],
      message: 'Datos no disponibles',
    });
  });
});
