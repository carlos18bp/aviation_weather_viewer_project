import type { DemoTimestamp } from '@/features/airports';
import type { WindField } from '@/features/weather/wind';

export type Coordinate = readonly [longitude: number, latitude: number];

export interface TemperatureValueGrid {
  scenario: 'demo-colombia-001';
  layer: 'temperature';
  width: 128;
  height: 160;
  bbox: readonly [-82, -5, -66, 14];
  unit: '°C';
  timestamp: DemoTimestamp;
  is_simulated: true;
  operational_use: false;
  no_data_value: null;
  values: number[];
}

export interface WeatherSample {
  coordinate: Coordinate;
  timestamp: DemoTimestamp;
  temperatureC: number;
  windSpeedKt: number;
  windDirectionDeg: number;
  is_simulated: true;
  operational_use: false;
}

export type WeatherSampleResult =
  | { status: 'ready'; sample: WeatherSample }
  | { status: 'outside-coverage'; coordinate: Coordinate }
  | { status: 'unavailable'; coordinate: Coordinate; message: string };

export interface WeatherPickerData {
  timestamp: DemoTimestamp;
  temperature: TemperatureValueGrid;
  wind: WindField;
}

export interface PickerFrameDescriptor {
  layer: 'temperature' | 'wind';
  timestamp: DemoTimestamp;
  dataUrl: string;
  valueDataUrl?: string;
}
