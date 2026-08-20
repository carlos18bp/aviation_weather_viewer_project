import {
  expectedTemperatureImageUrl,
  expectedTemperatureValueUrl,
  parsePickerFrameDescriptor,
  parseTemperatureValueGrid,
  TEMPERATURE_VALUE_GRID_COUNT,
  WeatherPickerValidationError,
} from '@/features/weather/picker';
import type { DemoTimestamp } from '@/features/airports';

const TIMESTAMP: DemoTimestamp = '2026-01-15T06:00:00Z';

function validDescriptor() {
  return {
    scenario: 'demo-colombia-001',
    layer: 'temperature',
    timestamp: TIMESTAMP,
    unit: '°C',
    is_simulated: true,
    operational_use: false,
    coverage: { west: -82, south: -5, east: -66, north: 14 },
    minimum: 0,
    maximum: 38,
    data_url: expectedTemperatureImageUrl(TIMESTAMP),
    value_data_url: expectedTemperatureValueUrl(TIMESTAMP),
  };
}

function validGrid() {
  return {
    scenario: 'demo-colombia-001',
    layer: 'temperature',
    width: 128,
    height: 160,
    bbox: [-82, -5, -66, 14],
    unit: '°C',
    timestamp: TIMESTAMP,
    is_simulated: true,
    operational_use: false,
    no_data_value: null,
    values: Array.from({ length: TEMPERATURE_VALUE_GRID_COUNT }, () => 21.5),
  };
}

describe('weather picker schemas', () => {
  it('normalizes the temperature descriptor with its scalar URL', () => {
    expect(parsePickerFrameDescriptor(validDescriptor(), 'temperature', TIMESTAMP)).toEqual({
      layer: 'temperature',
      timestamp: TIMESTAMP,
      dataUrl: expectedTemperatureImageUrl(TIMESTAMP),
      valueDataUrl: expectedTemperatureValueUrl(TIMESTAMP),
    });
  });

  it('rejects value_data_url on a wind descriptor', () => {
    const wind = {
      ...validDescriptor(),
      layer: 'wind',
      unit: 'kt',
      maximum: 60,
      data_url: '/media/demo-weather/demo-colombia-001/wind/06Z.json',
    };

    expect(() => parsePickerFrameDescriptor(wind, 'wind', TIMESTAMP)).toThrow(
      WeatherPickerValidationError,
    );
  });

  it('parses a detached scalar grid', () => {
    const payload = validGrid();
    const parsed = parseTemperatureValueGrid(payload, TIMESTAMP);

    expect(parsed).toMatchObject({
      scenario: 'demo-colombia-001',
      layer: 'temperature',
      width: 128,
      height: 160,
      bbox: [-82, -5, -66, 14],
      unit: '°C',
      timestamp: TIMESTAMP,
      is_simulated: true,
      operational_use: false,
      no_data_value: null,
    });
    expect(parsed.values).toHaveLength(TEMPERATURE_VALUE_GRID_COUNT);
    expect(parsed.values).not.toBe(payload.values);
  });

  it.each([
    ['timestamp', { timestamp: '2026-01-15T09:00:00Z' }],
    ['flags', { operational_use: true }],
    ['bbox', { bbox: [-81, -5, -66, 14] }],
    ['shape', { values: [20] }],
    ['range', { values: [39, ...validGrid().values.slice(1)] }],
    ['finite values', { values: [Number.NaN, ...validGrid().values.slice(1)] }],
  ])('rejects invalid grid %s', (_label, mutation) => {
    expect(() => parseTemperatureValueGrid(
      { ...validGrid(), ...mutation },
      TIMESTAMP,
    )).toThrow(WeatherPickerValidationError);
  });
});
