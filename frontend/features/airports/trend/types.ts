import type { DemoTimestamp } from '../types';


export interface AirportTrendPoint {
  timestamp: DemoTimestamp;
  temperatureC: number;
  windSpeedKt: number;
  windDirectionDeg: number;
  visibilityKm: number;
  pressureHpa: number;
}
