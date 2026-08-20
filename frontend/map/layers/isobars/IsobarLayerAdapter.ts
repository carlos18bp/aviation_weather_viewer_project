import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

import {
  assertIsobarFrame,
  defaultIsobarCollectionLoader,
  EMPTY_ISOBAR_COLLECTION,
  isIsobarAbortError,
  parseIsobarFeatureCollection,
  type IsobarCollectionLoader,
  type IsobarErrorCallback,
  type IsobarFeatureCollection,
  type IsobarFrame,
} from '@/features/weather/isobars';
import { BASEMAP_LAYER_IDS } from '@/map/constants';

import {
  ISOBAR_CLEANUP_LAYER_ORDER,
  ISOBAR_LABEL_LAYER_ID,
  ISOBAR_LAYER_ORDER,
  ISOBAR_LINE_LAYER_ID,
  ISOBAR_SOURCE_ID,
} from './constants';

export interface IsobarLayerAdapterOptions {
  collectionLoader?: IsobarCollectionLoader;
  onError?: IsobarErrorCallback;
}

export class IsobarLayerAdapter {
  readonly id = 'pressure-isobars' as const;

  private readonly collectionLoader: IsobarCollectionLoader;
  private readonly onError?: IsobarErrorCallback;
  private initialized = false;
  private destroyed = false;
  private visible = false;
  private requestVersion = 0;
  private activeController: AbortController | null = null;

  constructor(
    private readonly map: MapLibreMap,
    options: IsobarLayerAdapterOptions = {},
  ) {
    this.collectionLoader = options.collectionLoader ?? defaultIsobarCollectionLoader;
    this.onError = options.onError;
  }

  async initialize(): Promise<void> {
    if (this.destroyed) throw new Error('Cannot initialize a destroyed isobar adapter.');
    if (this.initialized) return;
    if (
      this.map.getSource(ISOBAR_SOURCE_ID)
      || this.map.getLayer(ISOBAR_LINE_LAYER_ID)
      || this.map.getLayer(ISOBAR_LABEL_LAYER_ID)
    ) {
      throw new Error('Isobar MapLibre identifiers are already in use.');
    }

    this.map.addSource(ISOBAR_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_ISOBAR_COLLECTION,
    });
    try {
      const beforeId = this.map.getLayer(BASEMAP_LAYER_IDS.countryLabels)
        ? BASEMAP_LAYER_IDS.countryLabels
        : undefined;
      this.map.addLayer({
        id: ISOBAR_LINE_LAYER_ID,
        type: 'line',
        source: ISOBAR_SOURCE_ID,
        layout: { visibility: this.visible ? 'visible' : 'none' },
        paint: {
          'line-color': '#dce6f2',
          'line-opacity': 0.58,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.75, 9, 1.4],
        },
      }, beforeId);
      this.map.addLayer({
        id: ISOBAR_LABEL_LAYER_ID,
        type: 'symbol',
        source: ISOBAR_SOURCE_ID,
        layout: {
          visibility: this.visible ? 'visible' : 'none',
          'symbol-placement': 'line',
          'symbol-spacing': 420,
          'text-field': ['concat', ['to-string', ['get', 'pressure_hpa']], ' hPa'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#e5edf5',
          'text-opacity': 0.82,
          'text-halo-color': '#07131f',
          'text-halo-width': 1.1,
        },
      }, beforeId);
      this.initialized = true;
    } catch (error) {
      this.cleanupMapResources();
      throw error;
    }
  }

  setFrame(collection: IsobarFeatureCollection): void {
    this.assertOperational();
    const timestamp = collection.features[0]?.properties.timestamp;
    if (!timestamp) throw new Error('Isobar collection does not contain a timestamp.');
    const validated = parseIsobarFeatureCollection(collection, timestamp);
    this.isobarSource().setData(validated);
  }

  async loadFrame(frame: IsobarFrame): Promise<boolean> {
    this.assertOperational();
    assertIsobarFrame(frame);
    const requestVersion = ++this.requestVersion;
    this.cancelActiveLoad();
    const controller = new AbortController();
    this.activeController = controller;

    let collection: IsobarFeatureCollection;
    try {
      collection = await this.collectionLoader(frame, controller.signal);
    } catch (error) {
      if (
        controller.signal.aborted
        || this.destroyed
        || requestVersion !== this.requestVersion
        || isIsobarAbortError(error)
      ) {
        return false;
      }
      this.visible = false;
      this.applyVisibility();
      this.onError?.(error instanceof Error ? error : new Error(String(error)), frame);
      return false;
    } finally {
      if (this.activeController === controller) this.activeController = null;
    }

    if (
      this.destroyed
      || controller.signal.aborted
      || requestVersion !== this.requestVersion
    ) {
      return false;
    }
    this.setFrame(collection);
    return true;
  }

  setVisible(visible: boolean): void {
    if (this.destroyed) return;
    if (!visible) {
      ++this.requestVersion;
      this.cancelActiveLoad();
    }
    if (visible === this.visible) return;
    this.visible = visible;
    this.applyVisibility();
  }

  reset(): void {
    if (this.destroyed) return;
    ++this.requestVersion;
    this.cancelActiveLoad();
    this.visible = false;
    this.applyVisibility();
    if (this.initialized && this.map.getSource(ISOBAR_SOURCE_ID)) {
      this.isobarSource().setData(EMPTY_ISOBAR_COLLECTION);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    ++this.requestVersion;
    this.cancelActiveLoad();
    this.cleanupMapResources();
    this.initialized = false;
  }

  private assertOperational(): void {
    if (this.destroyed) throw new Error('Cannot set a frame on a destroyed isobar adapter.');
    if (!this.initialized) {
      throw new Error('Isobar adapter must be initialized before setting a frame.');
    }
  }

  private isobarSource(): GeoJSONSource {
    const source = this.map.getSource(ISOBAR_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source || source.type !== 'geojson' || typeof source.setData !== 'function') {
      throw new Error('Isobar GeoJSONSource is unavailable.');
    }
    return source;
  }

  private applyVisibility(): void {
    if (!this.initialized) return;
    const visibility = this.visible ? 'visible' : 'none';
    for (const layerId of ISOBAR_LAYER_ORDER) {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    }
  }

  private cancelActiveLoad(): void {
    this.activeController?.abort();
    this.activeController = null;
  }

  private cleanupMapResources(): void {
    for (const layerId of ISOBAR_CLEANUP_LAYER_ORDER) {
      if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
    }
    if (this.map.getSource(ISOBAR_SOURCE_ID)) this.map.removeSource(ISOBAR_SOURCE_ID);
  }
}

export function createIsobarLayerAdapter(
  map: MapLibreMap,
  options: IsobarLayerAdapterOptions = {},
): IsobarLayerAdapter {
  return new IsobarLayerAdapter(map, options);
}
