import type { Coordinates, ImageSource, Map as MapLibreMap } from 'maplibre-gl';

import {
  parseVisibilityFrameDescriptor,
  VISIBILITY_IMAGE_COORDINATES,
  type VisibilityErrorCallback,
  type VisibilityRasterFrame,
} from '@/features/weather/visibility';
import { BASEMAP_LAYER_IDS } from '@/map/constants';

import {
  TRANSPARENT_VISIBILITY_IMAGE_DATA_URL,
  VISIBILITY_OPACITY,
  VISIBILITY_RASTER_LAYER_ID,
  VISIBILITY_SOURCE_ID,
} from './constants';

export interface VisibilityLayerAdapterOptions {
  onError?: VisibilityErrorCallback;
}

function imageCoordinates(): Coordinates {
  return VISIBILITY_IMAGE_COORDINATES.map(
    ([longitude, latitude]) => [longitude, latitude],
  ) as Coordinates;
}

export class VisibilityLayerAdapter {
  readonly id = 'visibility' as const;

  private initialized = false;
  private destroyed = false;
  private visible = true;
  private opacity: number = VISIBILITY_OPACITY;
  private currentFrame: VisibilityRasterFrame | null = null;

  constructor(
    private readonly map: MapLibreMap,
    private readonly options: VisibilityLayerAdapterOptions = {},
  ) {}

  async initialize(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cannot initialize a destroyed visibility adapter.');
    }
    if (this.initialized) return;
    if (
      this.map.getSource(VISIBILITY_SOURCE_ID)
      || this.map.getLayer(VISIBILITY_RASTER_LAYER_ID)
    ) {
      throw new Error('Visibility MapLibre identifiers are already in use.');
    }
    this.map.addSource(VISIBILITY_SOURCE_ID, {
      type: 'image',
      url: TRANSPARENT_VISIBILITY_IMAGE_DATA_URL,
      coordinates: imageCoordinates(),
    });
    try {
      const layer = {
        id: VISIBILITY_RASTER_LAYER_ID,
        type: 'raster' as const,
        source: VISIBILITY_SOURCE_ID,
        layout: { visibility: this.visible ? 'visible' as const : 'none' as const },
        paint: {
          'raster-opacity': this.opacity,
          'raster-fade-duration': 0,
        },
      };
      if (this.map.getLayer(BASEMAP_LAYER_IDS.coastline)) {
        this.map.addLayer(layer, BASEMAP_LAYER_IDS.coastline);
      } else {
        this.map.addLayer(layer);
      }
      this.initialized = true;
    } catch (error) {
      this.cleanupMapResources();
      throw error;
    }
  }

  async setFrame(frame: VisibilityRasterFrame): Promise<void> {
    this.assertOperational();
    parseVisibilityFrameDescriptor(frame.descriptor);
    try {
      this.visibilitySource().updateImage({
        image: frame.image,
        coordinates: imageCoordinates(),
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.options.onError?.(normalizedError, frame);
      throw normalizedError;
    }
    this.currentFrame = frame;
  }

  setVisible(visible: boolean): void {
    if (this.destroyed || visible === this.visible) return;
    this.visible = visible;
    if (this.initialized && this.map.getLayer(VISIBILITY_RASTER_LAYER_ID)) {
      this.map.setLayoutProperty(
        VISIBILITY_RASTER_LAYER_ID,
        'visibility',
        visible ? 'visible' : 'none',
      );
    }
  }

  setOpacity(opacity: number): void {
    if (opacity !== VISIBILITY_OPACITY) {
      throw new RangeError(`Visibility opacity is fixed at ${VISIBILITY_OPACITY}.`);
    }
    if (this.destroyed || opacity === this.opacity) return;
    this.opacity = opacity;
    if (this.initialized && this.map.getLayer(VISIBILITY_RASTER_LAYER_ID)) {
      this.map.setPaintProperty(VISIBILITY_RASTER_LAYER_ID, 'raster-opacity', opacity);
    }
  }

  reset(): void {
    if (
      this.destroyed
      || !this.initialized
      || !this.currentFrame
      || !this.map.getSource(VISIBILITY_SOURCE_ID)
    ) return;
    this.visibilitySource().updateImage({
      image: this.currentFrame.image,
      coordinates: imageCoordinates(),
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.currentFrame = null;
    this.cleanupMapResources();
    this.initialized = false;
  }

  private assertOperational(): void {
    if (this.destroyed) {
      throw new Error('Cannot set a frame on a destroyed visibility adapter.');
    }
    if (!this.initialized) {
      throw new Error('Visibility adapter must be initialized before setting a frame.');
    }
  }

  private visibilitySource(): ImageSource {
    const source = this.map.getSource(VISIBILITY_SOURCE_ID) as ImageSource | undefined;
    if (!source || source.type !== 'image' || typeof source.updateImage !== 'function') {
      throw new Error('Visibility ImageSource is unavailable.');
    }
    return source;
  }

  private cleanupMapResources(): void {
    if (this.map.getLayer(VISIBILITY_RASTER_LAYER_ID)) {
      this.map.removeLayer(VISIBILITY_RASTER_LAYER_ID);
    }
    if (this.map.getSource(VISIBILITY_SOURCE_ID)) {
      this.map.removeSource(VISIBILITY_SOURCE_ID);
    }
  }
}

export function createVisibilityLayerAdapter(
  map: MapLibreMap,
  options: VisibilityLayerAdapterOptions = {},
): VisibilityLayerAdapter {
  return new VisibilityLayerAdapter(map, options);
}
