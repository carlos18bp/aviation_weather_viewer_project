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

export interface WeatherLegendDefinition {
  title: 'Temperatura' | 'Viento';
  unit: '°C' | 'kt';
  minimum: number;
  maximum: number;
  colorStops: ReadonlyArray<readonly [number, string]>;
}

export type WindFallbackCode =
  | 'webgl2-unavailable'
  | 'renderer-initialization-failed'
  | 'renderer-runtime-failed'
  | 'webgl-context-lost';

export interface WindFallbackEvent {
  code: WindFallbackCode;
  message: string;
  cause?: unknown;
}
