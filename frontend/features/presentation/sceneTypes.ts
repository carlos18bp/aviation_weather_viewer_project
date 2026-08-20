import type { DemoAirportIcao, DemoTimestamp } from '@/features/airports';


export type SceneWeatherLayerId = 'wind' | 'temperature' | 'precipitation';
export type Coordinate = readonly [longitude: number, latitude: number];

export interface MapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface DemoRoute {
  originIcao: DemoAirportIcao;
  destinationIcao: DemoAirportIcao;
}

export interface ViewerScene {
  layer: SceneWeatherLayerId;
  timestamp: DemoTimestamp;
  viewport: MapViewport;
  airport: DemoAirportIcao | null;
  picker: Coordinate | null;
  route: DemoRoute | null;
  isobarsVisible: boolean;
  presentationMode: boolean;
}

export const DEFAULT_VIEWER_SCENE: Readonly<ViewerScene> = Object.freeze({
  layer: 'wind',
  timestamp: '2026-01-15T06:00:00Z',
  viewport: Object.freeze({
    longitude: -73.5,
    latitude: 4.5,
    zoom: 4.7,
  }),
  airport: null,
  picker: null,
  route: null,
  isobarsVisible: false,
  presentationMode: false,
});
