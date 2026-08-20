import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

import {
  emptyRouteGeoJson,
  routeAnalysisToGeoJson,
  type RouteAnalysis,
} from '@/features/route';
import { BASEMAP_LAYER_IDS } from '@/map/constants';
import { AIRPORT_LAYER_IDS } from '@/map/layers/airport';
import { WEATHER_PICKER_POINT_LAYER_ID } from '@/map/layers/picker';

import {
  ROUTE_BASE_COLOR,
  ROUTE_CLEANUP_LAYER_ORDER,
  ROUTE_FOCUS_DURATION_MS,
  ROUTE_FOCUS_MAX_ZOOM,
  ROUTE_FOCUS_PADDING_PX,
  ROUTE_HEADWIND_COLOR,
  ROUTE_LAYER_ORDER,
  ROUTE_NEUTRAL_COLOR,
  ROUTE_TAILWIND_COLOR,
  WEATHER_ROUTE_LINE_LAYER_ID,
  WEATHER_ROUTE_SAMPLES_LAYER_ID,
  WEATHER_ROUTE_SOURCE_ID,
} from './constants';


function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
export class RouteLayerAdapter {
  readonly id = 'route' as const;

  private initialized = false;
  private destroyed = false;
  private visible = true;
  private analysis: RouteAnalysis | null = null;

  constructor(private readonly map: MapLibreMap) {}

  async initialize(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cannot initialize a destroyed route adapter.');
    }
    if (this.initialized) {
      return;
    }
    if (
      this.map.getSource(WEATHER_ROUTE_SOURCE_ID)
      || this.map.getLayer(WEATHER_ROUTE_LINE_LAYER_ID)
      || this.map.getLayer(WEATHER_ROUTE_SAMPLES_LAYER_ID)
    ) {
      throw new Error('Route MapLibre identifiers are already in use.');
    }

    try {
      this.map.addSource(WEATHER_ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: emptyRouteGeoJson(),
      });
      const beforeLayerId = this.findBeforeLayerId();
      this.map.addLayer({
        id: WEATHER_ROUTE_LINE_LAYER_ID,
        type: 'line',
        source: WEATHER_ROUTE_SOURCE_ID,
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: {
          visibility: this.visible ? 'visible' : 'none',
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'kind'], 'route-base'],
            ROUTE_BASE_COLOR,
            [
              'match',
              ['get', 'windEffect'],
              'tailwind',
              ROUTE_TAILWIND_COLOR,
              'headwind',
              ROUTE_HEADWIND_COLOR,
              ROUTE_NEUTRAL_COLOR,
            ],
          ],
          'line-width': [
            'case',
            ['==', ['get', 'kind'], 'route-base'],
            5,
            3,
          ],
          'line-opacity': [
            'case',
            ['==', ['get', 'kind'], 'route-base'],
            0.35,
            0.95,
          ],
        },
      }, beforeLayerId);
      this.map.addLayer({
        id: WEATHER_ROUTE_SAMPLES_LAYER_ID,
        type: 'circle',
        source: WEATHER_ROUTE_SOURCE_ID,
        filter: ['==', ['get', 'kind'], 'route-sample'],
        layout: {
          visibility: this.visible ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4,
            2.5,
            8,
            4,
          ],
          'circle-color': [
            'match',
            ['get', 'windEffect'],
            'tailwind',
            ROUTE_TAILWIND_COLOR,
            'headwind',
            ROUTE_HEADWIND_COLOR,
            ROUTE_NEUTRAL_COLOR,
          ],
          'circle-stroke-color': '#07131f',
          'circle-stroke-width': 1.25,
        },
      }, beforeLayerId);
      this.initialized = true;
    } catch (error) {
      this.cleanupMapResources();
      throw error;
    }
  }

  setAnalysis(analysis: RouteAnalysis | null): void {
    this.assertOperational();
    const data = analysis ? routeAnalysisToGeoJson(analysis) : emptyRouteGeoJson();
    this.geoJsonSource().setData(data);
    this.analysis = analysis;
  }

  setFrameAnalysis(analysis: RouteAnalysis | null): void {
    this.setAnalysis(analysis);
  }

  setVisible(visible: boolean): void {
    if (this.destroyed || visible === this.visible) {
      return;
    }
    this.visible = visible;
    if (!this.initialized) {
      return;
    }
    for (const layerId of ROUTE_LAYER_ORDER) {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(
          layerId,
          'visibility',
          visible ? 'visible' : 'none',
        );
      }
    }
  }

  focus(): void {
    if (this.destroyed || !this.analysis || this.analysis.samples.length === 0) {
      return;
    }
    const longitudes = this.analysis.samples.map((sample) => sample.coordinate[0]);
    const latitudes = this.analysis.samples.map((sample) => sample.coordinate[1]);
    let west = Math.min(...longitudes);
    let south = Math.min(...latitudes);
    let east = Math.max(...longitudes);
    let north = Math.max(...latitudes);
    const maxBounds = this.map.getMaxBounds();
    if (maxBounds) {
      west = clamp(west, maxBounds.getWest(), maxBounds.getEast());
      east = clamp(east, maxBounds.getWest(), maxBounds.getEast());
      south = clamp(south, maxBounds.getSouth(), maxBounds.getNorth());
      north = clamp(north, maxBounds.getSouth(), maxBounds.getNorth());
    }
    this.map.fitBounds(
      [[west, south], [east, north]],
      {
        padding: ROUTE_FOCUS_PADDING_PX,
        duration: ROUTE_FOCUS_DURATION_MS,
        maxZoom: ROUTE_FOCUS_MAX_ZOOM,
        essential: false,
      },
    );
  }

  reset(): void {
    if (!this.destroyed && this.initialized) {
      this.setAnalysis(null);
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.analysis = null;
    this.cleanupMapResources();
    this.initialized = false;
  }

  private findBeforeLayerId(): string | undefined {
    const candidates = [
      AIRPORT_LAYER_IDS.points,
      WEATHER_PICKER_POINT_LAYER_ID,
      BASEMAP_LAYER_IDS.countryLabels,
      BASEMAP_LAYER_IDS.departmentLabels,
    ];
    return candidates.find((layerId) => this.map.getLayer(layerId));
  }

  private geoJsonSource(): GeoJSONSource {
    const source = this.map.getSource(WEATHER_ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source || typeof source.setData !== 'function') {
      throw new Error('Route GeoJSON source is unavailable.');
    }
    return source;
  }

  private cleanupMapResources(): void {
    for (const layerId of ROUTE_CLEANUP_LAYER_ORDER) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }
    if (this.map.getSource(WEATHER_ROUTE_SOURCE_ID)) {
      this.map.removeSource(WEATHER_ROUTE_SOURCE_ID);
    }
  }

  private assertOperational(): void {
    if (this.destroyed) {
      throw new Error('Cannot update a destroyed route adapter.');
    }
    if (!this.initialized) {
      throw new Error('Route adapter must be initialized before use.');
    }
  }
}

export function createRouteLayerAdapter(map: MapLibreMap): RouteLayerAdapter {
  return new RouteLayerAdapter(map);
}
