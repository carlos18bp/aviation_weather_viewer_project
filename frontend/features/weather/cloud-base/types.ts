import type {
  AviationLayerFrameDescriptor,
  AviationScalarGrid,
} from '@/features/weather/aviation-layer-contracts';
import type { AviationRasterFrame } from '@/features/weather/cloud-cover';

export interface CloudBaseFrameDescriptor extends AviationLayerFrameDescriptor {
  layer: 'cloud-base';
  unit: 'ft AGL';
  minimum: 300;
  maximum: 15000;
}

export interface CloudBaseScalarGrid extends AviationScalarGrid {
  layer: 'cloud-base';
  unit: 'ft AGL';
  values: Array<number | null>;
}

export type CloudBaseRasterFrame = AviationRasterFrame<
  CloudBaseFrameDescriptor,
  CloudBaseScalarGrid
>;
