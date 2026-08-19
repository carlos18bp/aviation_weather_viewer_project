import type {
  Coordinates,
  ImageSource,
  Map as MapLibreMap,
} from 'maplibre-gl';

import {
  assertTemperatureFrame,
  defaultTemperatureImageLoader,
  isTemperatureAbortError,
  releaseTemperatureImage,
  TEMPERATURE_IMAGE_COORDINATES,
  type TemperatureFrame,
  type TemperatureImageLoader,
} from '@/features/weather/temperature';
import type { WeatherLayerAdapter } from '@/lib/weather/viewerTypes';
import { BASEMAP_LAYER_IDS } from '@/map/constants';

import {
  TEMPERATURE_OPACITY,
  TEMPERATURE_RASTER_LAYER_ID,
  TEMPERATURE_SOURCE_ID,
  TRANSPARENT_IMAGE_DATA_URL,
} from './constants';

export interface TemperatureLayerAdapterOptions {
  imageLoader?: TemperatureImageLoader;
}

function imageCoordinates(): Coordinates {
  return TEMPERATURE_IMAGE_COORDINATES.map(
    ([longitude, latitude]) => [longitude, latitude],
  ) as Coordinates;
}

export class TemperatureLayerAdapter implements WeatherLayerAdapter<TemperatureFrame> {
  readonly id = 'temperature' as const;

  private readonly map: MapLibreMap;
  private readonly imageLoader: TemperatureImageLoader;
  private initialized = false;
  private destroyed = false;
  private visible = true;
  private requestVersion = 0;
  private activeController: AbortController | null = null;
  private currentFrame: TemperatureFrame | null = null;
  private currentImage: HTMLImageElement | null = null;

  constructor(map: MapLibreMap, options: TemperatureLayerAdapterOptions = {}) {
    this.map = map;
    this.imageLoader = options.imageLoader ?? defaultTemperatureImageLoader;
  }

  async initialize(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cannot initialize a destroyed temperature adapter.');
    }
    if (this.initialized) {
      return;
    }
    if (this.map.getSource(TEMPERATURE_SOURCE_ID) || this.map.getLayer(TEMPERATURE_RASTER_LAYER_ID)) {
      throw new Error('Temperature MapLibre identifiers are already in use.');
    }

    this.map.addSource(TEMPERATURE_SOURCE_ID, {
      type: 'image',
      url: TRANSPARENT_IMAGE_DATA_URL,
      coordinates: imageCoordinates(),
    });

    try {
      const layer = {
        id: TEMPERATURE_RASTER_LAYER_ID,
        type: 'raster' as const,
        source: TEMPERATURE_SOURCE_ID,
        layout: {
          visibility: this.visible ? 'visible' as const : 'none' as const,
        },
        paint: {
          'raster-opacity': TEMPERATURE_OPACITY,
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
      if (this.map.getLayer(TEMPERATURE_RASTER_LAYER_ID)) {
        this.map.removeLayer(TEMPERATURE_RASTER_LAYER_ID);
      }
      if (this.map.getSource(TEMPERATURE_SOURCE_ID)) {
        this.map.removeSource(TEMPERATURE_SOURCE_ID);
      }
      throw error;
    }
  }

  async setFrame(frame: TemperatureFrame): Promise<void> {
    this.assertOperational();
    assertTemperatureFrame(frame);

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
        || isTemperatureAbortError(error)
      ) {
        return;
      }
      throw error;
    } finally {
      if (this.activeController === controller) {
        this.activeController = null;
      }
    }

    if (this.destroyed || controller.signal.aborted || requestVersion !== this.requestVersion) {
      releaseTemperatureImage(image);
      return;
    }

    const source = this.temperatureSource();
    try {
      source.updateImage({
        image,
        coordinates: imageCoordinates(),
      });
    } catch (error) {
      releaseTemperatureImage(image);
      throw error;
    }

    const previousImage = this.currentImage;
    this.currentFrame = frame;
    this.currentImage = image;
    releaseTemperatureImage(previousImage);
  }

  setVisible(visible: boolean): void {
    if (this.destroyed || visible === this.visible) {
      return;
    }

    this.visible = visible;
    if (this.initialized && this.map.getLayer(TEMPERATURE_RASTER_LAYER_ID)) {
      this.map.setLayoutProperty(
        TEMPERATURE_RASTER_LAYER_ID,
        'visibility',
        visible ? 'visible' : 'none',
      );
    }
  }

  reset(): void {
    if (this.destroyed) {
      return;
    }

    ++this.requestVersion;
    this.cancelActiveLoad();
    if (this.initialized && this.currentImage && this.currentFrame) {
      this.temperatureSource().updateImage({
        image: this.currentImage,
        coordinates: imageCoordinates(),
      });
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    ++this.requestVersion;
    this.cancelActiveLoad();
    releaseTemperatureImage(this.currentImage);
    this.currentImage = null;
    this.currentFrame = null;

    if (this.map.getLayer(TEMPERATURE_RASTER_LAYER_ID)) {
      this.map.removeLayer(TEMPERATURE_RASTER_LAYER_ID);
    }
    if (this.map.getSource(TEMPERATURE_SOURCE_ID)) {
      this.map.removeSource(TEMPERATURE_SOURCE_ID);
    }
    this.initialized = false;
  }

  private assertOperational(): void {
    if (this.destroyed) {
      throw new Error('Cannot set a frame on a destroyed temperature adapter.');
    }
    if (!this.initialized) {
      throw new Error('Temperature adapter must be initialized before setting a frame.');
    }
  }

  private temperatureSource(): ImageSource {
    const source = this.map.getSource(TEMPERATURE_SOURCE_ID);
    if (!source) {
      throw new Error('Temperature ImageSource is unavailable.');
    }
    const imageSource = source as ImageSource;
    if (imageSource.type !== 'image' || typeof imageSource.updateImage !== 'function') {
      throw new Error('Temperature ImageSource is unavailable.');
    }
    return imageSource;
  }

  private cancelActiveLoad(): void {
    this.activeController?.abort();
    this.activeController = null;
  }
}

export function createTemperatureLayerAdapter(
  map: MapLibreMap,
  options: TemperatureLayerAdapterOptions = {},
): TemperatureLayerAdapter {
  return new TemperatureLayerAdapter(map, options);
}
