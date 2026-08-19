export type TemperatureTimestamp =
  | '2026-01-15T00:00:00Z'
  | '2026-01-15T03:00:00Z'
  | '2026-01-15T06:00:00Z'
  | '2026-01-15T09:00:00Z'
  | '2026-01-15T12:00:00Z'
  | '2026-01-15T15:00:00Z';

export type TemperatureBbox = readonly [-82, -5, -66, 14];

export type TemperatureImageCoordinates = readonly [
  readonly [-82, 14],
  readonly [-66, 14],
  readonly [-66, -5],
  readonly [-82, -5],
];

export interface TemperatureCoverageResponse {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface TemperatureFrameResponse {
  scenario: string;
  layer: string;
  timestamp: string;
  unit: string;
  is_simulated: boolean;
  operational_use: boolean;
  coverage: TemperatureCoverageResponse;
  minimum: number;
  maximum: number;
  data_url: string;
}

export interface TemperatureFrame {
  scenario: 'demo-colombia-001';
  layer: 'temperature';
  timestamp: TemperatureTimestamp;
  unit: '°C';
  isSimulated: true;
  operationalUse: false;
  bbox: TemperatureBbox;
  minimum: 0;
  maximum: 38;
  imageUrl: string;
}

export interface WeatherLegendDefinition {
  title: 'Temperatura' | 'Viento';
  unit: '°C' | 'kt';
  minimum: number;
  maximum: number;
  colorStops: ReadonlyArray<readonly [number, string]>;
}

export type TemperatureImageLoader = (
  imageUrl: string,
  signal: AbortSignal,
) => Promise<HTMLImageElement>;
