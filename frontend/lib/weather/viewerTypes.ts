import type { FeatureCollection } from 'geojson';

import type { MapViewport } from '@/features/presentation';
import type { DemoRoute, RouteAnalysis } from '@/features/route';
import type {
  IsobarFeatureCollection,
} from '@/features/weather/isobars';
import type { Coordinate } from '@/features/weather/picker';
import type { PrecipitationFrame } from '@/features/weather/precipitation';


export type WeatherLayerId = 'temperature' | 'wind' | 'precipitation';

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
  selectedCoordinate: Coordinate | null;
  selectedRoute: DemoRoute | null;
  isobarsVisible: boolean;
  presentationMode: boolean;
  mapViewport: MapViewport;
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

export type PrecipitationWeatherMapFrame = PrecipitationFrame;

export type WeatherMapFrame =
  | TemperatureWeatherMapFrame
  | WindWeatherMapFrame
  | PrecipitationWeatherMapFrame;

export interface WeatherMapController {
  initialize(): Promise<void>;
  setLayer(layerId: WeatherLayerId): void;
  prepareWeatherFrame?(frame: WeatherMapFrame, signal: AbortSignal): Promise<void>;
  setWeatherFrame(frame: WeatherMapFrame): Promise<void>;
  setAirports(collection: FeatureCollection): void;
  setSelectedAirport(icaoCode: string | null): void;
  focusAirport(icaoCode: string): void;
  setSelectedCoordinate(coordinate: Coordinate | null): void;
  setRoute(route: DemoRoute | null, analysis?: RouteAnalysis | null): void;
  setIsobarFrame(collection: IsobarFeatureCollection | null): void;
  setIsobarsVisible(visible: boolean): void;
  setViewport(viewport: MapViewport): void;
  resize(): void;
  reset(): void;
  destroy(): void;
}

export interface WeatherLayerAdapter<TFrame> {
  readonly id:
    | WeatherLayerId
    | 'pressure-isobars'
    | 'route'
    | 'airports'
    | 'picker';
  initialize(): Promise<void>;
  prepareFrame?(frame: TFrame, signal: AbortSignal): Promise<void>;
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
  precipitation?: WeatherLayerAdapter<PrecipitationWeatherMapFrame>;
  isobars?: WeatherLayerAdapter<IsobarFeatureCollection | null>;
  route?: WeatherLayerAdapter<RouteAnalysis | null>;
  airports?: WeatherLayerAdapter<FeatureCollection>;
  picker?: WeatherLayerAdapter<Coordinate | null>;
}
