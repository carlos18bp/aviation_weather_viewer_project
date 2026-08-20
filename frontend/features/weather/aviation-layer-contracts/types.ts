import type { DemoTimestamp } from '@/features/airports';

export type AviationLayerId =
  | 'cloud-cover'
  | 'cloud-base'
  | 'visibility'
  | 'wind-gusts';

export type AviationLayerUnit = '%' | 'ft AGL' | 'km' | 'kt';
export type AviationGridNullPolicy = 'propagate' | 'reject';
export type AviationCoordinate = readonly [longitude: number, latitude: number];

export interface AviationLayerDefinition {
  id: AviationLayerId;
  name: string;
  category: 'aviation';
  kind: 'scalar';
  unit: AviationLayerUnit;
  minimum: number;
  maximum: number;
  supportsPointValue: true;
  opacity: number;
  colorStops: readonly (readonly [value: number, color: string])[];
}

export interface AviationScalarGrid {
  scenario: 'demo-colombia-001';
  layer: AviationLayerId;
  width: 128;
  height: 160;
  bbox: readonly [-82, -5, -66, 14];
  unit: AviationLayerUnit;
  timestamp: DemoTimestamp;
  is_simulated: true;
  operational_use: false;
  no_data_value: null;
  values: Array<number | null>;
}

export interface AviationLayerFrameDescriptor {
  layer: AviationLayerId;
  timestamp: DemoTimestamp;
  unit: AviationLayerUnit;
  minimum: number;
  maximum: number;
  imageUrl: string;
  valueDataUrl: string;
  isSimulated: true;
  operationalUse: false;
}

export interface AviationManifestFrameDescriptor {
  layer: AviationLayerId;
  timestamp: DemoTimestamp;
  data_path: string;
  value_data_path: string;
  minimum: number;
  maximum: number;
}
