import type { Map as MapLibreMap } from 'maplibre-gl';

import type { WindFallbackEvent, WindField } from '@/features/weather/wind';
import {
  createWindRenderer,
  type WindRenderer,
} from '@/map/renderers/wind/WindRenderer';

export interface WindLayerAdapterOptions {
  onFallback?: (event: WindFallbackEvent) => void;
}

export class WindLayerAdapter {
  readonly id = 'wind' as const;

  private readonly renderer: WindRenderer;
  private currentField: WindField | null = null;
  private destroyed = false;

  constructor(map: MapLibreMap, options: WindLayerAdapterOptions = {}) {
    this.renderer = createWindRenderer(map, options);
  }

  initialize(): Promise<void> {
    return this.renderer.initialize();
  }

  setFrame(field: WindField): void {
    if (this.destroyed) {
      throw new Error('Cannot set a frame on a destroyed wind adapter.');
    }

    this.renderer.setField(field);
    this.currentField = field;
  }

  setVisible(visible: boolean): void {
    this.renderer.setVisible(visible);
  }

  resize(): void {
    this.renderer.resize();
  }

  reset(): void {
    if (this.currentField && !this.destroyed) {
      this.renderer.setField(this.currentField);
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.currentField = null;
    this.renderer.destroy();
  }
}

export function createWindLayerAdapter(
  map: MapLibreMap,
  options: WindLayerAdapterOptions = {},
): WindLayerAdapter {
  return new WindLayerAdapter(map, options);
}
