import type { Map as MapLibreMap } from 'maplibre-gl';

import { BASEMAP_LAYER_IDS } from '@/map/constants';

export interface FakeImageUpdate {
  url?: string;
  image?: HTMLImageElement | ImageBitmap | ImageData;
  coordinates?: unknown;
}

export class FakeCloudImageSource {
  readonly type = 'image';
  readonly updates: FakeImageUpdate[] = [];
  failNextUpdate: Error | null = null;

  updateImage(update: FakeImageUpdate): this {
    if (this.failNextUpdate) {
      const error = this.failNextUpdate;
      this.failNextUpdate = null;
      throw error;
    }
    this.updates.push(update);
    return this;
  }
}

export class FakeCloudMap {
  readonly sources = new Map<string, FakeCloudImageSource>();
  readonly layers = new Map<string, unknown>([
    [BASEMAP_LAYER_IDS.departmentBoundaries, {}],
  ]);
  readonly operations: string[] = [];
  readonly layoutUpdates: Array<readonly [string, string, unknown]> = [];
  readonly paintUpdates: Array<readonly [string, string, unknown]> = [];
  addSourceCount = 0;
  addLayerCount = 0;

  addSource(id: string): void {
    this.addSourceCount += 1;
    this.sources.set(id, new FakeCloudImageSource());
    this.operations.push(`add-source:${id}`);
  }

  getSource(id: string): FakeCloudImageSource | undefined {
    return this.sources.get(id);
  }

  removeSource(id: string): void {
    this.sources.delete(id);
    this.operations.push(`remove-source:${id}`);
  }

  addLayer(layer: { id: string }, beforeId?: string): void {
    this.addLayerCount += 1;
    this.layers.set(layer.id, layer);
    this.operations.push(`add-layer:${layer.id}:before:${beforeId ?? 'none'}`);
  }

  getLayer(id: string): unknown {
    return this.layers.get(id);
  }

  removeLayer(id: string): void {
    this.layers.delete(id);
    this.operations.push(`remove-layer:${id}`);
  }

  setLayoutProperty(layerId: string, property: string, value: unknown): void {
    this.layoutUpdates.push([layerId, property, value]);
  }

  setPaintProperty(layerId: string, property: string, value: unknown): void {
    this.paintUpdates.push([layerId, property, value]);
  }

  asMap(): MapLibreMap {
    return this as unknown as MapLibreMap;
  }
}
