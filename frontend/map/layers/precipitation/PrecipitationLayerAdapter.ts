import type { Coordinates, ImageSource, Map as MapLibreMap } from 'maplibre-gl';

import {
  assertPrecipitationFrame,
  defaultPrecipitationImageLoader,
  isPrecipitationAbortError,
  PRECIPITATION_IMAGE_COORDINATES,
  releasePrecipitationImage,
  type PrecipitationErrorCallback,
  type PrecipitationFrame,
  type PrecipitationImageLoader,
} from '@/features/weather/precipitation';
import { BASEMAP_LAYER_IDS } from '@/map/constants';

import {
  PRECIPITATION_OPACITY,
  PRECIPITATION_RASTER_LAYER_ID,
  PRECIPITATION_SOURCE_ID,
  TRANSPARENT_PRECIPITATION_IMAGE_DATA_URL,
} from './constants';

export interface PrecipitationLayerAdapterOptions {
  imageLoader?: PrecipitationImageLoader;
  onError?: PrecipitationErrorCallback;
}

function imageCoordinates(): Coordinates {
  return PRECIPITATION_IMAGE_COORDINATES.map(
    ([longitude, latitude]) => [longitude, latitude],
  ) as Coordinates;
}

export class PrecipitationLayerAdapter {
  readonly id = 'precipitation' as const;

  private readonly imageLoader: PrecipitationImageLoader;
  private readonly onError?: PrecipitationErrorCallback;
  private initialized = false;
  private destroyed = false;
  private visible = true;
  private requestVersion = 0;
  private activeController: AbortController | null = null;
  private currentFrame: PrecipitationFrame | null = null;
  private currentImage: HTMLImageElement | null = null;

  constructor(
    private readonly map: MapLibreMap,
    options: PrecipitationLayerAdapterOptions = {},
  ) {
    this.imageLoader = options.imageLoader ?? defaultPrecipitationImageLoader;
    this.onError = options.onError;
  }

  async initialize(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cannot initialize a destroyed precipitation adapter.');
    }
    if (this.initialized) return;
    if (
      this.map.getSource(PRECIPITATION_SOURCE_ID)
      || this.map.getLayer(PRECIPITATION_RASTER_LAYER_ID)
    ) {
      throw new Error('Precipitation MapLibre identifiers are already in use.');
    }

    this.map.addSource(PRECIPITATION_SOURCE_ID, {
      type: 'image',
      url: TRANSPARENT_PRECIPITATION_IMAGE_DATA_URL,
      coordinates: imageCoordinates(),
    });
    try {
      const layer = {
        id: PRECIPITATION_RASTER_LAYER_ID,
        type: 'raster' as const,
        source: PRECIPITATION_SOURCE_ID,
        layout: { visibility: this.visible ? 'visible' as const : 'none' as const },
        paint: {
          'raster-opacity': PRECIPITATION_OPACITY,
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

  async setFrame(frame: PrecipitationFrame): Promise<void> {
    this.assertOperational();
    assertPrecipitationFrame(frame);
    const requestVersion = ++this.requestVersion;
    this.cancelActiveLoad();
    const controller = new AbortController();
    this.activeController = controller;

    let image: HTMLImageElement;
    try {
      image = await this.imageLoader(frame.imageUrl, controller.signal);
    } catch (error) {
      if (
        controller.signal.aborted
        || this.destroyed
        || requestVersion !== this.requestVersion
        || isPrecipitationAbortError(error)
      ) {
        return;
      }
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.onError?.(normalizedError, frame);
      throw normalizedError;
    } finally {
      if (this.activeController === controller) this.activeController = null;
    }

    if (
      this.destroyed
      || controller.signal.aborted
      || requestVersion !== this.requestVersion
    ) {
      releasePrecipitationImage(image);
      return;
    }
    const source = this.precipitationSource();
    try {
      source.updateImage({ image, coordinates: imageCoordinates() });
    } catch (error) {
      releasePrecipitationImage(image);
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.onError?.(normalizedError, frame);
      throw normalizedError;
    }
    const previousImage = this.currentImage;
    this.currentFrame = frame;
    this.currentImage = image;
    releasePrecipitationImage(previousImage);
  }

  setVisible(visible: boolean): void {
    if (this.destroyed || visible === this.visible) return;
    this.visible = visible;
    if (this.initialized && this.map.getLayer(PRECIPITATION_RASTER_LAYER_ID)) {
      this.map.setLayoutProperty(
        PRECIPITATION_RASTER_LAYER_ID,
        'visibility',
        visible ? 'visible' : 'none',
      );
    }
  }

  reset(): void {
    if (this.destroyed) return;
    ++this.requestVersion;
    this.cancelActiveLoad();
    if (this.initialized && this.currentImage && this.currentFrame) {
      this.precipitationSource().updateImage({
        image: this.currentImage,
        coordinates: imageCoordinates(),
      });
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    ++this.requestVersion;
    this.cancelActiveLoad();
    releasePrecipitationImage(this.currentImage);
    this.currentImage = null;
    this.currentFrame = null;
    this.cleanupMapResources();
    this.initialized = false;
  }

  private assertOperational(): void {
    if (this.destroyed) {
      throw new Error('Cannot set a frame on a destroyed precipitation adapter.');
    }
    if (!this.initialized) {
      throw new Error('Precipitation adapter must be initialized before setting a frame.');
    }
  }

  private precipitationSource(): ImageSource {
    const source = this.map.getSource(PRECIPITATION_SOURCE_ID) as ImageSource | undefined;
    if (!source || source.type !== 'image' || typeof source.updateImage !== 'function') {
      throw new Error('Precipitation ImageSource is unavailable.');
    }
    return source;
  }

  private cancelActiveLoad(): void {
    this.activeController?.abort();
    this.activeController = null;
  }

  private cleanupMapResources(): void {
    if (this.map.getLayer(PRECIPITATION_RASTER_LAYER_ID)) {
      this.map.removeLayer(PRECIPITATION_RASTER_LAYER_ID);
    }
    if (this.map.getSource(PRECIPITATION_SOURCE_ID)) {
      this.map.removeSource(PRECIPITATION_SOURCE_ID);
    }
  }
}

export function createPrecipitationLayerAdapter(
  map: MapLibreMap,
  options: PrecipitationLayerAdapterOptions = {},
): PrecipitationLayerAdapter {
  return new PrecipitationLayerAdapter(map, options);
}
