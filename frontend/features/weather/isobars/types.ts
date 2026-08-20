import type { Feature, FeatureCollection, LineString } from 'geojson';

export type IsobarTimestamp =
  | '2026-01-15T00:00:00Z'
  | '2026-01-15T03:00:00Z'
  | '2026-01-15T06:00:00Z'
  | '2026-01-15T09:00:00Z'
  | '2026-01-15T12:00:00Z'
  | '2026-01-15T15:00:00Z';

export type IsobarPressureHpa = 996 | 1000 | 1004 | 1008 | 1012 | 1016 | 1020 | 1024;

export interface IsobarProperties {
  pressure_hpa: IsobarPressureHpa;
  timestamp: IsobarTimestamp;
  is_simulated: true;
  operational_use: false;
}

export type IsobarFeature = Feature<LineString, IsobarProperties>;
export type IsobarFeatureCollection = FeatureCollection<LineString, IsobarProperties>;

export interface IsobarFrame {
  id: 'pressure-isobars';
  timestamp: IsobarTimestamp;
  unit: 'hPa';
  dataUrl: string;
  isSimulated: true;
  operationalUse: false;
}

export type IsobarCollectionLoader = (
  frame: IsobarFrame,
  signal: AbortSignal,
) => Promise<IsobarFeatureCollection>;

export type IsobarErrorCallback = (error: Error, frame: IsobarFrame) => void;
