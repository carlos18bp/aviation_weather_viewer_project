import type { ImageSource, Map as MapLibreMap } from 'maplibre-gl';

import type {
  AviationRasterFrame,
  CloudLayerId,
} from '@/features/weather/cloud-cover';
import { BASEMAP_LAYER_IDS } from '@/map/constants';

import {
  cloudImageCoordinates,
  TRANSPARENT_CLOUD_IMAGE_DATA_URL,
} from './constants';

export type CloudLayerAdapterErrorCallback<TFrame extends AviationRasterFrame> = (
  error: Error,
  frame: TFrame,
) => void;

export interface CloudLayerAdapterConfiguration<TFrame extends AviationRasterFrame> {
  id: CloudLayerId;
  sourceId: string;
  rasterLayerId: string;
  opacity: number;
  assertFrame(frame: TFrame): void;
  onError?: CloudLayerAdapterErrorCallback<TFrame>;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export class CloudLayerAdapter<TFrame extends AviationRasterFrame> {
  readonly id: CloudLayerId;

  private readonly sourceId: string;
  private readonly rasterLayerId: string;
  private readonly defaultOpacity: number;
  private readonly assertFrameContract: (frame: TFrame) => void;
  private readonly onError?: CloudLayerAdapterErrorCallback<TFrame>;
  private initialized = false;
  private destroyed = false;
  private visible = false;
  private opacity: number;
  private currentFrame: TFrame | null = null;

  constructor(
    private readonly map: MapLibreMap,
    configuration: CloudLayerAdapterConfiguration<TFrame>,
  ) {
    this.id = configuration.id;
    this.sourceId = configuration.sourceId;
    this.rasterLayerId = configuration.rasterLayerId;
    this.defaultOpacity = configuration.opacity;
    this.opacity = configuration.opacity;
    this.assertFrameContract = configuration.assertFrame;
    this.onError = configuration.onError;
  }

  async initialize(): Promise<void> {
    if (this.destroyed) {
      throw new Error(`Cannot initialize a destroyed ${this.id} adapter.`);
    }
    if (this.initialized) return;
    if (this.map.getSource(this.sourceId) || this.map.getLayer(this.rasterLayerId)) {
      throw new Error(`${this.id} MapLibre identifiers are already in use.`);
    }

    this.map.addSource(this.sourceId, {
      type: 'image',
      url: TRANSPARENT_CLOUD_IMAGE_DATA_URL,
      coordinates: cloudImageCoordinates(),
    });
    try {
      const layer = {
        id: this.rasterLayerId,
        type: 'raster' as const,
        source: this.sourceId,
        layout: { visibility: this.visible ? 'visible' as const : 'none' as const },
        paint: {
          'raster-opacity': this.opacity,
          'raster-fade-duration': 0,
        },
      };
      if (this.map.getLayer(BASEMAP_LAYER_IDS.departmentBoundaries)) {
        this.map.addLayer(layer, BASEMAP_LAYER_IDS.departmentBoundaries);
      } else {
        this.map.addLayer(layer);
      }
      this.initialized = true;
    } catch (error) {
      this.cleanupMapResources();
      throw error;
    }
  }

  async setFrame(frame: TFrame): Promise<void> {
    this.assertOperational();
    this.assertFrameContract(frame);
    if (!frame.objectUrl.startsWith('blob:')) {
      throw new TypeError(`${this.id} frame must use a blob object URL.`);
    }

    try {
      this.imageSource().updateImage({
        url: frame.objectUrl,
        coordinates: cloudImageCoordinates(),
      });
    } catch (error) {
      const normalized = normalizeError(error);
      this.onError?.(normalized, frame);
      throw normalized;
    }
    this.currentFrame = frame;
  }

  setVisible(visible: boolean): void {
    if (this.destroyed || visible === this.visible) return;
    this.visible = visible;
    if (this.initialized && this.map.getLayer(this.rasterLayerId)) {
      this.map.setLayoutProperty(
        this.rasterLayerId,
        'visibility',
        visible ? 'visible' : 'none',
      );
    }
  }

  setOpacity(opacity: number): void {
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      throw new RangeError('Cloud layer opacity must be between zero and one.');
    }
    if (this.destroyed || opacity === this.opacity) return;
    this.opacity = opacity;
    if (this.initialized && this.map.getLayer(this.rasterLayerId)) {
      this.map.setPaintProperty(this.rasterLayerId, 'raster-opacity', opacity);
    }
  }

  reset(): void {
    if (this.destroyed) return;
    this.opacity = this.defaultOpacity;
    if (this.initialized && this.map.getLayer(this.rasterLayerId)) {
      this.map.setPaintProperty(
        this.rasterLayerId,
        'raster-opacity',
        this.defaultOpacity,
      );
    }
    if (this.initialized && this.currentFrame && this.map.getSource(this.sourceId)) {
      try {
        this.imageSource().updateImage({
          url: this.currentFrame.objectUrl,
          coordinates: cloudImageCoordinates(),
        });
      } catch {
        // A reset remains safe when MapLibre is already tearing resources down.
      }
    }
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
      throw new Error(`Cannot set a frame on a destroyed ${this.id} adapter.`);
    }
    if (!this.initialized) {
      throw new Error(`${this.id} adapter must be initialized before setting a frame.`);
    }
  }

  private imageSource(): ImageSource {
    const source = this.map.getSource(this.sourceId) as ImageSource | undefined;
    if (!source || source.type !== 'image' || typeof source.updateImage !== 'function') {
      throw new Error(`${this.id} ImageSource is unavailable.`);
    }
    return source;
  }

  private cleanupMapResources(): void {
    if (this.map.getLayer(this.rasterLayerId)) {
      this.map.removeLayer(this.rasterLayerId);
    }
    if (this.map.getSource(this.sourceId)) {
      this.map.removeSource(this.sourceId);
    }
  }
}
