import type { Coordinates, ImageSource, Map as MapLibreMap } from 'maplibre-gl';

import {
  parseWindGustFrameDescriptor,
  WIND_GUST_IMAGE_COORDINATES,
  type WindGustErrorCallback,
  type WindGustRasterFrame,
} from '@/features/weather/wind-gusts';
import { BASEMAP_LAYER_IDS } from '@/map/constants';

import {
  TRANSPARENT_WIND_GUST_IMAGE_DATA_URL,
  WIND_GUST_OPACITY,
  WIND_GUST_RASTER_LAYER_ID,
  WIND_GUST_SOURCE_ID,
} from './constants';

export interface WindGustLayerAdapterOptions {
  onError?: WindGustErrorCallback;
}

function imageCoordinates(): Coordinates {
  return WIND_GUST_IMAGE_COORDINATES.map(
    ([longitude, latitude]) => [longitude, latitude],
  ) as Coordinates;
}

export class WindGustLayerAdapter {
  readonly id = 'wind-gusts' as const;

  private initialized = false;
  private destroyed = false;
  private visible = true;
  private opacity: number = WIND_GUST_OPACITY;
  private currentFrame: WindGustRasterFrame | null = null;

  constructor(
    private readonly map: MapLibreMap,
    private readonly options: WindGustLayerAdapterOptions = {},
  ) {}

  async initialize(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cannot initialize a destroyed wind-gust adapter.');
    }
    if (this.initialized) return;
    if (
      this.map.getSource(WIND_GUST_SOURCE_ID)
      || this.map.getLayer(WIND_GUST_RASTER_LAYER_ID)
    ) {
      throw new Error('Wind-gust MapLibre identifiers are already in use.');
    }
    this.map.addSource(WIND_GUST_SOURCE_ID, {
      type: 'image',
      url: TRANSPARENT_WIND_GUST_IMAGE_DATA_URL,
      coordinates: imageCoordinates(),
    });
    try {
      const layer = {
        id: WIND_GUST_RASTER_LAYER_ID,
        type: 'raster' as const,
        source: WIND_GUST_SOURCE_ID,
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

  async setFrame(frame: WindGustRasterFrame): Promise<void> {
    this.assertOperational();
    parseWindGustFrameDescriptor(frame.descriptor);
    try {
      this.windGustSource().updateImage({
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
    if (this.initialized && this.map.getLayer(WIND_GUST_RASTER_LAYER_ID)) {
      this.map.setLayoutProperty(
        WIND_GUST_RASTER_LAYER_ID,
        'visibility',
        visible ? 'visible' : 'none',
      );
    }
  }

  setOpacity(opacity: number): void {
    if (opacity !== WIND_GUST_OPACITY) {
      throw new RangeError(`Wind-gust opacity is fixed at ${WIND_GUST_OPACITY}.`);
    }
    if (this.destroyed || opacity === this.opacity) return;
    this.opacity = opacity;
    if (this.initialized && this.map.getLayer(WIND_GUST_RASTER_LAYER_ID)) {
      this.map.setPaintProperty(WIND_GUST_RASTER_LAYER_ID, 'raster-opacity', opacity);
    }
  }

  reset(): void {
    if (
      this.destroyed
      || !this.initialized
      || !this.currentFrame
      || !this.map.getSource(WIND_GUST_SOURCE_ID)
    ) return;
    this.windGustSource().updateImage({
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
      throw new Error('Cannot set a frame on a destroyed wind-gust adapter.');
    }
    if (!this.initialized) {
      throw new Error('Wind-gust adapter must be initialized before setting a frame.');
    }
  }

  private windGustSource(): ImageSource {
    const source = this.map.getSource(WIND_GUST_SOURCE_ID) as ImageSource | undefined;
    if (!source || source.type !== 'image' || typeof source.updateImage !== 'function') {
      throw new Error('Wind-gust ImageSource is unavailable.');
    }
    return source;
  }

  private cleanupMapResources(): void {
    if (this.map.getLayer(WIND_GUST_RASTER_LAYER_ID)) {
      this.map.removeLayer(WIND_GUST_RASTER_LAYER_ID);
    }
    if (this.map.getSource(WIND_GUST_SOURCE_ID)) {
      this.map.removeSource(WIND_GUST_SOURCE_ID);
    }
  }
}

export function createWindGustLayerAdapter(
  map: MapLibreMap,
  options: WindGustLayerAdapterOptions = {},
): WindGustLayerAdapter {
  return new WindGustLayerAdapter(map, options);
}
