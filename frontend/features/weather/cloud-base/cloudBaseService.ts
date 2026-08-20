import type {
  CloudFrameCachePolicy,
  CloudLayerFrameService,
  CloudLayerServiceDependencies,
} from '@/features/weather/cloud-cover';
import { BoundedCloudLayerFrameService } from '@/features/weather/cloud-cover/cloudLayerService';

import {
  parseCloudBaseFrameDescriptor,
  parseCloudBaseScalarGrid,
} from './cloudBaseSchema';
import type {
  CloudBaseFrameDescriptor,
  CloudBaseRasterFrame,
  CloudBaseScalarGrid,
} from './types';

export interface CreateCloudBaseFrameServiceOptions
  extends CloudLayerServiceDependencies {
  cachePolicy: CloudFrameCachePolicy;
}

export type CloudBaseFrameService = CloudLayerFrameService<CloudBaseRasterFrame>;

export function createCloudBaseFrameService(
  options: CreateCloudBaseFrameServiceOptions,
): CloudBaseFrameService {
  return new BoundedCloudLayerFrameService<
    CloudBaseFrameDescriptor,
    CloudBaseScalarGrid
  >({
    ...options,
    parseDescriptor: parseCloudBaseFrameDescriptor,
    parseGrid: parseCloudBaseScalarGrid,
  });
}
