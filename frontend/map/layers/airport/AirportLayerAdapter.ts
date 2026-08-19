import type { FeatureCollection } from 'geojson';
import type {
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from 'maplibre-gl';

import {
  isDemoAirportIcao,
  parseAirportFeatureCollection,
  type DemoAirportIcao,
} from '@/features/airports';

import {
  AIRPORT_CLEANUP_LAYER_ORDER,
  AIRPORT_FOCUS_DURATION_MS,
  AIRPORT_FOCUS_ZOOM,
  AIRPORT_LAYER_IDS,
  AIRPORT_LAYER_ORDER,
  AIRPORT_SOURCE_ID,
} from './constants';


export type AirportSelectCallback = (icaoCode: DemoAirportIcao) => void;

const EMPTY_SELECTION_FILTER: FilterSpecification = [
  '==',
  ['get', 'icao_code'],
  '__no-airport-selected__',
];

function selectionFilter(icaoCode: DemoAirportIcao): FilterSpecification {
  return ['==', ['get', 'icao_code'], icaoCode];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export class AirportLayerAdapter {
  readonly id = 'airports' as const;

  private readonly coordinatesByIcao = new Map<DemoAirportIcao, [number, number]>();
  private initialized = false;
  private resourcesCreated = false;
  private listenerRegistered = false;
  private visible = true;
  private selectedIcaoCode: DemoAirportIcao | null = null;
  private destroyed = false;

  constructor(
    private readonly map: MapLibreMap,
    private readonly onSelect: AirportSelectCallback,
  ) {}

  async initialize(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cannot initialize a destroyed airport adapter.');
    }

    this.initialized = true;
  }

  setFrame(collection: FeatureCollection): void {
    this.assertUsable();
    const validatedCollection = parseAirportFeatureCollection(collection);

    if (!this.resourcesCreated) {
      this.createMapResources(validatedCollection);
    } else {
      const source = this.getGeoJsonSource();
      if (!source) {
        throw new Error('Airport GeoJSON source is unavailable.');
      }
      source.setData(validatedCollection);
    }

    this.coordinatesByIcao.clear();
    for (const feature of validatedCollection.features) {
      this.coordinatesByIcao.set(
        feature.properties.icao_code,
        [...feature.geometry.coordinates] as [number, number],
      );
    }

    if (this.selectedIcaoCode && !this.coordinatesByIcao.has(this.selectedIcaoCode)) {
      this.selectedIcaoCode = null;
    }
    this.applySelectionFilter();
  }

  setSelectedFeature(featureId: string | null): void {
    if (this.destroyed) {
      return;
    }

    const normalizedFeatureId = featureId?.toUpperCase() ?? null;
    this.selectedIcaoCode = isDemoAirportIcao(normalizedFeatureId) ? normalizedFeatureId : null;
    this.applySelectionFilter();
  }

  focusFeature(featureId: string): void {
    if (this.destroyed) {
      return;
    }

    const normalizedFeatureId = featureId.toUpperCase();
    if (!isDemoAirportIcao(normalizedFeatureId)) {
      return;
    }

    const coordinates = this.coordinatesByIcao.get(normalizedFeatureId);
    if (!coordinates) {
      return;
    }

    let [longitude, latitude] = coordinates;
    const maxBounds = this.map.getMaxBounds();
    if (maxBounds) {
      longitude = clamp(longitude, maxBounds.getWest(), maxBounds.getEast());
      latitude = clamp(latitude, maxBounds.getSouth(), maxBounds.getNorth());
    }

    const zoom = Math.min(
      Math.max(this.map.getZoom(), AIRPORT_FOCUS_ZOOM),
      this.map.getMaxZoom(),
    );
    this.map.easeTo({
      center: [longitude, latitude],
      zoom,
      duration: AIRPORT_FOCUS_DURATION_MS,
      essential: false,
    });
  }

  setVisible(visible: boolean): void {
    if (this.destroyed) {
      return;
    }

    this.visible = visible;
    if (!this.resourcesCreated) {
      return;
    }

    const visibility = visible ? 'visible' : 'none';
    for (const layerId of AIRPORT_LAYER_ORDER) {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    }
  }

  reset(): void {
    this.setSelectedFeature(null);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.cleanupMapResources();
    this.coordinatesByIcao.clear();
    this.selectedIcaoCode = null;
    this.initialized = false;
  }

  private createMapResources(collection: FeatureCollection): void {
    try {
      this.map.addSource(AIRPORT_SOURCE_ID, {
        type: 'geojson',
        data: collection,
      });
      this.map.addLayer({
        id: AIRPORT_LAYER_IDS.points,
        type: 'circle',
        source: AIRPORT_SOURCE_ID,
        paint: {
          'circle-radius': 5,
          'circle-color': '#22d3ee',
          'circle-stroke-color': '#07131f',
          'circle-stroke-width': 1.5,
        },
      });
      this.map.addLayer({
        id: AIRPORT_LAYER_IDS.selection,
        type: 'circle',
        source: AIRPORT_SOURCE_ID,
        filter: EMPTY_SELECTION_FILTER,
        paint: {
          'circle-radius': 10,
          'circle-color': 'rgba(34, 211, 238, 0.12)',
          'circle-stroke-color': '#22d3ee',
          'circle-stroke-width': 2,
          'circle-blur': 0.15,
        },
      });
      this.map.addLayer({
        id: AIRPORT_LAYER_IDS.labels,
        type: 'symbol',
        source: AIRPORT_SOURCE_ID,
        layout: {
          'text-field': ['get', 'icao_code'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#f5f7fa',
          'text-halo-color': '#07131f',
          'text-halo-width': 1.25,
        },
      });
      this.map.on('click', AIRPORT_LAYER_IDS.points, this.handleAirportClick);
      this.listenerRegistered = true;
      this.resourcesCreated = true;
      this.setVisible(this.visible);
    } catch (error) {
      this.cleanupMapResources();
      throw error;
    }
  }

  private applySelectionFilter(): void {
    if (!this.resourcesCreated || !this.map.getLayer(AIRPORT_LAYER_IDS.selection)) {
      return;
    }

    this.map.setFilter(
      AIRPORT_LAYER_IDS.selection,
      this.selectedIcaoCode
        ? selectionFilter(this.selectedIcaoCode)
        : EMPTY_SELECTION_FILTER,
    );
  }

  private getGeoJsonSource(): GeoJSONSource | null {
    return (this.map.getSource(AIRPORT_SOURCE_ID) as GeoJSONSource | undefined) ?? null;
  }

  private cleanupMapResources(): void {
    if (this.listenerRegistered) {
      this.map.off('click', AIRPORT_LAYER_IDS.points, this.handleAirportClick);
      this.listenerRegistered = false;
    }

    for (const layerId of AIRPORT_CLEANUP_LAYER_ORDER) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }
    if (this.map.getSource(AIRPORT_SOURCE_ID)) {
      this.map.removeSource(AIRPORT_SOURCE_ID);
    }

    this.resourcesCreated = false;
  }

  private assertUsable(): void {
    if (this.destroyed) {
      throw new Error('Cannot set a frame on a destroyed airport adapter.');
    }
    if (!this.initialized) {
      throw new Error('Airport adapter must be initialized before setting a frame.');
    }
  }

  private readonly handleAirportClick = (event: MapLayerMouseEvent) => {
    const icaoCode = event.features?.[0]?.properties?.icao_code;
    if (isDemoAirportIcao(icaoCode) && this.coordinatesByIcao.has(icaoCode)) {
      this.onSelect(icaoCode);
    }
  };
}

export function createAirportLayerAdapter(
  map: MapLibreMap,
  onSelect: AirportSelectCallback,
): AirportLayerAdapter {
  return new AirportLayerAdapter(map, onSelect);
}
