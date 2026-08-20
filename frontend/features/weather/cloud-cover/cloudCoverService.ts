import { BoundedCloudLayerFrameService } from './cloudLayerService';
import {
  parseCloudCoverFrameDescriptor,
  parseCloudCoverScalarGrid,
} from './cloudCoverSchema';
import type {
  CloudCoverFrameDescriptor,
  CloudCoverRasterFrame,
  CloudCoverScalarGrid,
  CloudFrameCachePolicy,
  CloudLayerFrameService,
} from './types';
import type { CloudLayerServiceDependencies } from './cloudLayerService';

export interface CreateCloudCoverFrameServiceOptions
  extends CloudLayerServiceDependencies {
  cachePolicy: CloudFrameCachePolicy;
}

export type CloudCoverFrameService = CloudLayerFrameService<CloudCoverRasterFrame>;

export function createCloudCoverFrameService(
  options: CreateCloudCoverFrameServiceOptions,
): CloudCoverFrameService {
  return new BoundedCloudLayerFrameService<
    CloudCoverFrameDescriptor,
    CloudCoverScalarGrid
  >({
    ...options,
    parseDescriptor: parseCloudCoverFrameDescriptor,
    parseGrid: parseCloudCoverScalarGrid,
  });
}
