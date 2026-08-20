export {
  CLOUD_BASE_FRAME_DESCRIPTORS,
  CLOUD_BASE_LAYER_ID,
  CLOUD_BASE_LEGEND,
  CLOUD_BASE_MAXIMUM,
  CLOUD_BASE_MINIMUM,
  CLOUD_BASE_NULL_COPY,
  CLOUD_BASE_OPACITY,
  CLOUD_BASE_UNIT,
} from './constants';
export {
  parseCloudBaseFrameDescriptor,
  parseCloudBaseScalarGrid,
} from './cloudBaseSchema';
export { sampleCloudBaseAtCoordinate } from './cloudBaseSampler';
export {
  createCloudBaseFrameService,
  type CloudBaseFrameService,
  type CreateCloudBaseFrameServiceOptions,
} from './cloudBaseService';
export type {
  CloudBaseFrameDescriptor,
  CloudBaseRasterFrame,
  CloudBaseScalarGrid,
} from './types';
export type {
  AviationRasterFrame,
  CloudFrameCacheLimit,
  CloudFrameCachePolicy,
  CloudLayerFrameService,
  CloudLayerLegendDefinition,
  CloudLayerServiceDependencies,
} from '@/features/weather/cloud-cover';
