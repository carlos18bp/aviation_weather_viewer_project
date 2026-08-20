import type { Map as MapLibreMap } from 'maplibre-gl';

import {
  CLOUD_COVER_OPACITY,
  parseCloudCoverFrameDescriptor,
  type CloudCoverRasterFrame,
} from '@/features/weather/cloud-cover';

import {
  CloudLayerAdapter,
  type CloudLayerAdapterErrorCallback,
} from './CloudLayerAdapter';
import {
  CLOUD_COVER_RASTER_LAYER_ID,
  CLOUD_COVER_SOURCE_ID,
} from './constants';

export interface CloudCoverLayerAdapterOptions {
  onError?: CloudLayerAdapterErrorCallback<CloudCoverRasterFrame>;
}

function assertCloudCoverFrame(frame: CloudCoverRasterFrame): void {
  parseCloudCoverFrameDescriptor(frame.descriptor);
}

export function createCloudCoverLayerAdapter(
  map: MapLibreMap,
  options: CloudCoverLayerAdapterOptions = {},
): CloudLayerAdapter<CloudCoverRasterFrame> {
  return new CloudLayerAdapter(map, {
    id: 'cloud-cover',
    sourceId: CLOUD_COVER_SOURCE_ID,
    rasterLayerId: CLOUD_COVER_RASTER_LAYER_ID,
    opacity: CLOUD_COVER_OPACITY,
    assertFrame: assertCloudCoverFrame,
    onError: options.onError,
  });
}
