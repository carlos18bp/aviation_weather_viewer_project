import type { DemoTimestamp } from '@/features/airports';
import type {
  AviationLayerFrameDescriptor,
  AviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';

export type CloudLayerId = 'cloud-cover' | 'cloud-base';
export type CloudFrameCacheLimit = 1 | 2 | 3;

export interface CloudFrameCachePolicy {
  maxEntries: CloudFrameCacheLimit;
}

export interface CloudLayerLegendDefinition {
  id: CloudLayerId;
  title: string;
  unit: '%' | 'ft AGL';
  minimum: number;
  maximum: number;
  opacity: number;
  colorStops: readonly (readonly [value: number, color: string])[];
  isSimulated: true;
  operationalUse: false;
  nullCopy?: string;
}

export interface AviationRasterFrame<
  TDescriptor extends AviationLayerFrameDescriptor = AviationLayerFrameDescriptor,
  TGrid extends AviationScalarGrid = AviationScalarGrid,
> {
  descriptor: TDescriptor;
  objectUrl: string;
  valueGrid: TGrid | null;
  valueError: Error | null;
}

export interface CloudCoverFrameDescriptor extends AviationLayerFrameDescriptor {
  layer: 'cloud-cover';
  unit: '%';
  minimum: 0;
  maximum: 100;
}

export interface CloudCoverScalarGrid extends AviationScalarGrid {
  layer: 'cloud-cover';
  unit: '%';
  values: number[];
}

export type CloudCoverRasterFrame = AviationRasterFrame<
  CloudCoverFrameDescriptor,
  CloudCoverScalarGrid
>;

export interface CloudLayerFrameService<TFrame extends AviationRasterFrame> {
  readonly size: number;
  load(descriptor: unknown, signal: AbortSignal): Promise<TFrame>;
  retain(timestamps: readonly DemoTimestamp[]): void;
  getCached(timestamp: string): TFrame | null;
  destroy(): void;
}
