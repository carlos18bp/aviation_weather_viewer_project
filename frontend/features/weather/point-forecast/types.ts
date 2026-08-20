import type { DemoTimestamp } from '@/features/airports';
import type {
  AviationLayerFrameDescriptor,
  AviationLayerId,
} from '@/features/weather/aviation-layer-contracts';
import type { Coordinate } from '@/features/weather/picker';

export type PointForecastMetric =
  | 'temperature'
  | 'wind'
  | 'cloud-cover'
  | 'cloud-base'
  | 'visibility'
  | 'wind-gusts';

export type PointForecastSecondaryMetric = AviationLayerId;
export type PointForecastStatus = 'idle' | 'loading' | 'partial' | 'ready' | 'error';

export interface AviationPointSample {
  coordinate: Coordinate;
  timestamp: DemoTimestamp;
  temperatureC: number;
  windSpeedKt: number;
  windDirectionDeg: number;
  cloudCoverPct: number | null;
  cloudBaseFtAgl: number | null;
  visibilityKm: number | null;
  windGustKt: number | null;
  isSimulated: true;
  operationalUse: false;
}

export interface PointForecastSeries {
  coordinate: Coordinate;
  points: readonly AviationPointSample[];
  unavailableMetrics: readonly PointForecastSecondaryMetric[];
}

export interface PointForecastLoadResult {
  status: 'partial' | 'ready';
  series: PointForecastSeries;
}

export type PointForecastDescriptorMap = Readonly<
  Record<DemoTimestamp, Readonly<Record<AviationLayerId, AviationLayerFrameDescriptor>>>
>;

export interface PointForecastState {
  status: PointForecastStatus;
  coordinate: Coordinate | null;
  series: PointForecastSeries | null;
  error: string | null;
  requestId: number;
}
