export type PrecipitationTimestamp =
  | '2026-01-15T00:00:00Z'
  | '2026-01-15T03:00:00Z'
  | '2026-01-15T06:00:00Z'
  | '2026-01-15T09:00:00Z'
  | '2026-01-15T12:00:00Z'
  | '2026-01-15T15:00:00Z';

export type PrecipitationBbox = readonly [-82, -5, -66, 14];

export type PrecipitationImageCoordinates = readonly [
  readonly [-82, 14],
  readonly [-66, 14],
  readonly [-66, -5],
  readonly [-82, -5],
];

export interface PrecipitationCoverageResponse {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface PrecipitationFrameResponse {
  scenario: string;
  layer: string;
  timestamp: string;
  unit: string;
  is_simulated: boolean;
  operational_use: boolean;
  coverage: PrecipitationCoverageResponse;
  minimum: number;
  maximum: number;
  data_url: string;
}

export interface PrecipitationFrame {
  scenario: 'demo-colombia-001';
  layer: 'precipitation';
  timestamp: PrecipitationTimestamp;
  unit: 'mm/h';
  minimum: 0;
  maximum: 40;
  imageUrl: string;
  isSimulated: true;
  operationalUse: false;
}

export interface PrecipitationLegendDefinition {
  title: 'Precipitación simulada';
  unit: 'mm/h';
  minimum: 0;
  maximum: 40;
  colorStops: ReadonlyArray<readonly [number, string]>;
}

export type PrecipitationImageLoader = (
  imageUrl: string,
  signal: AbortSignal,
) => Promise<HTMLImageElement>;

export type PrecipitationErrorCallback = (
  error: Error,
  frame: PrecipitationFrame,
) => void;
