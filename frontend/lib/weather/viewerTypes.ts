import type { FeatureCollection } from 'geojson';


export type WeatherLayerId = 'temperature' | 'wind';

export interface WindField {
  scenario: 'demo-colombia-001';
  width: 128;
  height: 160;
  bbox: [-82, -5, -66, 14];
  unit: 'kt';
  timestamp: string;
  is_simulated: true;
  operational_use: false;
  no_data_value: null;
  u: number[];
  v: number[];
}

export interface WeatherViewerState {
  activeLayer: WeatherLayerId;
  activeTimestamp: string;
  availableTimestamps: string[];
  selectedAirport: string | null;
  isPlaying: boolean;
  isMapReady: boolean;
  isFrameLoading: boolean;
  frameError: string | null;
}

export type TemperatureWeatherMapFrame = {
  layer: 'temperature';
  timestamp: string;
  imageUrl: string;
};

export type WindWeatherMapFrame = {
  layer: 'wind';
  timestamp: string;
  field: WindField;
};

export type WeatherMapFrame = TemperatureWeatherMapFrame | WindWeatherMapFrame;

export interface WeatherMapController {
  initialize(): Promise<void>;
  setLayer(layerId: WeatherLayerId): void;
  setWeatherFrame(frame: WeatherMapFrame): Promise<void>;
  setAirports(collection: FeatureCollection): void;
  setSelectedAirport(icaoCode: string | null): void;
  focusAirport(icaoCode: string): void;
  resize(): void;
  reset(): void;
  destroy(): void;
}

export interface WeatherLayerAdapter<TFrame> {
  readonly id: WeatherLayerId | 'airports';
  initialize(): Promise<void>;
  setFrame?(frame: TFrame): Promise<void> | void;
  setSelectedFeature?(featureId: string | null): void;
  focusFeature?(featureId: string): void;
  setVisible(visible: boolean): void;
  reset(): void;
  destroy(): void;
}

export interface WeatherLayerAdapterRegistry {
  temperature?: WeatherLayerAdapter<TemperatureWeatherMapFrame>;
  wind?: WeatherLayerAdapter<WindWeatherMapFrame>;
  airports?: WeatherLayerAdapter<FeatureCollection>;
}
