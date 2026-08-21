import type { FeatureCollection } from 'geojson';

import type { MapViewport } from '@/features/presentation';
import type { DemoRoute, RouteAnalysis } from '@/features/route';
import type {
  IsobarFeatureCollection,
} from '@/features/weather/isobars';
import type { Coordinate } from '@/features/weather/picker';
import type { PrecipitationFrame } from '@/features/weather/precipitation';
import type { CloudBaseRasterFrame } from '@/features/weather/cloud-base';
import type { CloudCoverRasterFrame } from '@/features/weather/cloud-cover';
import type { VisibilityLoadedFrame } from '@/features/weather/visibility';
import type { WindGustLoadedFrame } from '@/features/weather/wind-gusts';


export type WeatherLayerId =
  | 'temperature'
  | 'wind'
  | 'precipitation'
  | 'cloud-cover'
  | 'cloud-base'
  | 'visibility'
  | 'wind-gusts';

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

export type CloudCoverWeatherMapFrame = {
  layer: 'cloud-cover';
  timestamp: string;
  frame: CloudCoverRasterFrame;
};

export type CloudBaseWeatherMapFrame = {
  layer: 'cloud-base';
  timestamp: string;
  frame: CloudBaseRasterFrame;
};

export type VisibilityWeatherMapFrame = {
  layer: 'visibility';
  timestamp: string;
  frame: VisibilityLoadedFrame;
};

export type WindGustWeatherMapFrame = {
  layer: 'wind-gusts';
  timestamp: string;
  frame: WindGustLoadedFrame;
};

export type WeatherMapFrame =
  | TemperatureWeatherMapFrame
  | WindWeatherMapFrame
  | PrecipitationWeatherMapFrame
  | CloudCoverWeatherMapFrame
  | CloudBaseWeatherMapFrame
  | VisibilityWeatherMapFrame
  | WindGustWeatherMapFrame;

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
  setTouchRouteCapture?(active: boolean): void;
  setTouchReposition?(active: boolean): void;
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
    | 'picker'
    | 'touch-coordinator';
  initialize(): Promise<void>;
  prepareFrame?(frame: TFrame, signal: AbortSignal): Promise<void>;
  cancelPreparedFrame?(): void;
  setFrame?(frame: TFrame): Promise<void> | void;
  setSelectedFeature?(featureId: string | null): void;
  focusFeature?(featureId: string): void;
  setRouteCapture?(active: boolean): void;
  setReposition?(active: boolean): void;
  setVisible(visible: boolean): void;
  reset(): void;
  destroy(): void;
}

export interface WeatherLayerAdapterRegistry {
  temperature?: WeatherLayerAdapter<TemperatureWeatherMapFrame>;
  wind?: WeatherLayerAdapter<WindWeatherMapFrame>;
  precipitation?: WeatherLayerAdapter<PrecipitationWeatherMapFrame>;
  cloudCover?: WeatherLayerAdapter<CloudCoverWeatherMapFrame>;
  cloudBase?: WeatherLayerAdapter<CloudBaseWeatherMapFrame>;
  visibility?: WeatherLayerAdapter<VisibilityWeatherMapFrame>;
  windGusts?: WeatherLayerAdapter<WindGustWeatherMapFrame>;
  isobars?: WeatherLayerAdapter<IsobarFeatureCollection | null>;
  route?: WeatherLayerAdapter<RouteAnalysis | null>;
  airports?: WeatherLayerAdapter<FeatureCollection>;
  picker?: WeatherLayerAdapter<Coordinate | null>;
  touch?: WeatherLayerAdapter<null>;
}
