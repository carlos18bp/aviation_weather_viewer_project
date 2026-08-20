import type {
  AirportFeatureCollection,
  DemoAirportIcao,
  DemoTimestamp,
} from '@/features/airports';
import type { Coordinate } from '@/features/weather/picker';
import type { WindField } from '@/features/weather/wind';


export interface DemoRoute {
  originIcao: DemoAirportIcao;
  destinationIcao: DemoAirportIcao;
}

export interface RouteAnalysisInput {
  route: DemoRoute;
  airports: AirportFeatureCollection;
  timestamp: DemoTimestamp;
  wind: WindField;
}

export interface RouteWindSample {
  coordinate: Coordinate;
  distanceNm: number;
  bearingDeg: number;
  windSpeedKt: number;
  alongWindKt: number;
  crossWindKt: number;
}

export interface RouteAnalysis {
  route: DemoRoute;
  totalDistanceNm: number;
  meanAlongWindKt: number;
  maximumCrossWindKt: number;
  samples: RouteWindSample[];
  is_simulated: true;
  operational_use: false;
}

export interface WindComponents {
  alongWindKt: number;
  crossWindKt: number;
}

export type AlongWindEffect = 'tailwind' | 'headwind' | 'neutral';
