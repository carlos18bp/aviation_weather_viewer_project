import type { Map as MapLibreMap } from 'maplibre-gl';

import {
  CLOUD_BASE_OPACITY,
  parseCloudBaseFrameDescriptor,
  type CloudBaseRasterFrame,
} from '@/features/weather/cloud-base';
import {
  CloudLayerAdapter,
  type CloudLayerAdapterErrorCallback,
} from '@/map/layers/cloud-cover';

import {
  CLOUD_BASE_RASTER_LAYER_ID,
  CLOUD_BASE_SOURCE_ID,
} from './constants';

export interface CloudBaseLayerAdapterOptions {
  onError?: CloudLayerAdapterErrorCallback<CloudBaseRasterFrame>;
}

function assertCloudBaseFrame(frame: CloudBaseRasterFrame): void {
  parseCloudBaseFrameDescriptor(frame.descriptor);
}

export function createCloudBaseLayerAdapter(
  map: MapLibreMap,
  options: CloudBaseLayerAdapterOptions = {},
): CloudLayerAdapter<CloudBaseRasterFrame> {
  return new CloudLayerAdapter(map, {
    id: 'cloud-base',
    sourceId: CLOUD_BASE_SOURCE_ID,
    rasterLayerId: CLOUD_BASE_RASTER_LAYER_ID,
    opacity: CLOUD_BASE_OPACITY,
    assertFrame: assertCloudBaseFrame,
    onError: options.onError,
  });
}
