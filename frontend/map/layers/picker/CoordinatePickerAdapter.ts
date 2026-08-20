import type { FeatureCollection, Point } from 'geojson';
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
} from 'maplibre-gl';

import {
  isCoordinateInsideCoverage,
  type Coordinate,
} from '@/features/weather/picker';

import {
  WEATHER_PICKER_POINT_LAYER_ID,
  WEATHER_PICKER_SOURCE_ID,
} from './constants';

export type CoordinateSelectCallback = (coordinate: Coordinate) => void;

export interface CoordinatePickerAdapterOptions {
  shouldHandleClick?: (event: MapMouseEvent) => boolean;
}

function emptyCollection(): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: [] };
}

function coordinateCollection(coordinate: Coordinate): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [...coordinate] },
        properties: {},
      },
    ],
  };
}

export class CoordinatePickerAdapter {
  readonly id = 'picker' as const;

  private initialized = false;
  private listenerRegistered = false;
  private visible = true;
  private destroyed = false;
  private coordinate: Coordinate | null = null;

  constructor(
    private readonly map: MapLibreMap,
    private readonly onSelect: CoordinateSelectCallback,
    private readonly options: CoordinatePickerAdapterOptions = {},
  ) {}

  async initialize(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cannot initialize a destroyed coordinate picker adapter.');
    }
    if (this.initialized) {
      return;
    }
    if (
      this.map.getSource(WEATHER_PICKER_SOURCE_ID)
      || this.map.getLayer(WEATHER_PICKER_POINT_LAYER_ID)
    ) {
      throw new Error('Coordinate picker MapLibre identifiers are already in use.');
    }

    try {
      this.map.addSource(WEATHER_PICKER_SOURCE_ID, {
        type: 'geojson',
        data: emptyCollection(),
      });
      this.map.addLayer({
        id: WEATHER_PICKER_POINT_LAYER_ID,
        type: 'circle',
        source: WEATHER_PICKER_SOURCE_ID,
        layout: {
          visibility: this.visible ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': 6,
          'circle-color': '#f8fafc',
          'circle-stroke-color': '#0ea5e9',
          'circle-stroke-width': 3,
          'circle-blur': 0.05,
        },
      });
      this.map.on('click', this.handleMapClick);
      this.listenerRegistered = true;
      this.initialized = true;
    } catch (error) {
      this.cleanupMapResources();
      throw error;
    }
  }

  setCoordinate(coordinate: Coordinate | null): void {
    this.assertOperational();
    if (coordinate && !isCoordinateInsideCoverage(coordinate)) {
      throw new RangeError('Coordinate is outside the frozen weather coverage.');
    }
    this.coordinate = coordinate ? [...coordinate] : null;
    this.geoJsonSource().setData(
      this.coordinate ? coordinateCollection(this.coordinate) : emptyCollection(),
    );
  }

  setVisible(visible: boolean): void {
    if (this.destroyed || visible === this.visible) {
      return;
    }
    this.visible = visible;
    if (this.initialized && this.map.getLayer(WEATHER_PICKER_POINT_LAYER_ID)) {
      this.map.setLayoutProperty(
        WEATHER_PICKER_POINT_LAYER_ID,
        'visibility',
        visible ? 'visible' : 'none',
      );
    }
  }

  reset(): void {
    if (!this.destroyed && this.initialized) {
      this.setCoordinate(null);
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.coordinate = null;
    this.cleanupMapResources();
    this.initialized = false;
  }

  private geoJsonSource(): GeoJSONSource {
    const source = this.map.getSource(WEATHER_PICKER_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source || typeof source.setData !== 'function') {
      throw new Error('Coordinate picker GeoJSON source is unavailable.');
    }
    return source;
  }

  private cleanupMapResources(): void {
    if (this.listenerRegistered) {
      this.map.off('click', this.handleMapClick);
      this.listenerRegistered = false;
    }
    if (this.map.getLayer(WEATHER_PICKER_POINT_LAYER_ID)) {
      this.map.removeLayer(WEATHER_PICKER_POINT_LAYER_ID);
    }
    if (this.map.getSource(WEATHER_PICKER_SOURCE_ID)) {
      this.map.removeSource(WEATHER_PICKER_SOURCE_ID);
    }
  }

  private assertOperational(): void {
    if (this.destroyed) {
      throw new Error('Cannot update a destroyed coordinate picker adapter.');
    }
    if (!this.initialized) {
      throw new Error('Coordinate picker adapter must be initialized before use.');
    }
  }

  private readonly handleMapClick = (event: MapMouseEvent) => {
    if (
      !this.visible
      || (this.options.shouldHandleClick && !this.options.shouldHandleClick(event))
    ) {
      return;
    }
    const coordinate: Coordinate = [event.lngLat.lng, event.lngLat.lat];
    if (isCoordinateInsideCoverage(coordinate)) {
      this.onSelect(coordinate);
    }
  };
}

export function createCoordinatePickerAdapter(
  map: MapLibreMap,
  onSelect: CoordinateSelectCallback,
  options: CoordinatePickerAdapterOptions = {},
): CoordinatePickerAdapter {
  return new CoordinatePickerAdapter(map, onSelect, options);
}
