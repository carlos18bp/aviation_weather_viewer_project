import type { Feature, FeatureCollection, MultiLineString, Position } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

import { WIND_SPEED_COLOR_STOPS, type WindField } from '@/features/weather/wind';

import { sampleWindField } from './WindFieldSampler';

export const WIND_FALLBACK_SOURCE_ID = 'wind-arrow-fallback-source';
export const WIND_FALLBACK_LAYER_ID = 'wind-arrow-fallback-layer';

const FALLBACK_COLUMNS = 8;
const FALLBACK_ROWS = 10;
const MIN_ARROW_LENGTH_DEGREES = 0.18;
const MAX_ARROW_LENGTH_DEGREES = 0.5;

export interface WindArrowProperties {
  speed_kt: number;
  u_kt: number;
  v_kt: number;
  timestamp: string;
}

export type WindArrowCollection = FeatureCollection<MultiLineString, WindArrowProperties>;
type MapLayerDefinition = Parameters<MapLibreMap['addLayer']>[0];

const EMPTY_ARROW_COLLECTION: WindArrowCollection = {
  type: 'FeatureCollection',
  features: [],
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function createArrowFeature(
  field: WindField,
  longitude: number,
  latitude: number,
): Feature<MultiLineString, WindArrowProperties> {
  const { u, v, speed } = sampleWindField(field, longitude, latitude);
  const safeSpeed = Math.max(speed, Number.EPSILON);
  const east = u / safeSpeed;
  const north = v / safeSpeed;
  const speedWeight = clamp(speed / 60, 0, 1);
  const arrowLength =
    MIN_ARROW_LENGTH_DEGREES +
    (MAX_ARROW_LENGTH_DEGREES - MIN_ARROW_LENGTH_DEGREES) * speedWeight;
  const longitudeScale = 1 / Math.max(Math.cos((latitude * Math.PI) / 180), 0.3);
  const deltaLongitude = east * arrowLength * longitudeScale;
  const deltaLatitude = north * arrowLength;
  const start: Position = [
    longitude - deltaLongitude * 0.45,
    latitude - deltaLatitude * 0.45,
  ];
  const end: Position = [
    longitude + deltaLongitude * 0.55,
    latitude + deltaLatitude * 0.55,
  ];
  const headLength = arrowLength * 0.28;
  const headWidth = arrowLength * 0.18;
  const headBaseLongitude = end[0] - east * headLength * longitudeScale;
  const headBaseLatitude = end[1] - north * headLength;
  const headLeft: Position = [
    headBaseLongitude - north * headWidth * longitudeScale,
    headBaseLatitude + east * headWidth,
  ];
  const headRight: Position = [
    headBaseLongitude + north * headWidth * longitudeScale,
    headBaseLatitude - east * headWidth,
  ];

  return {
    type: 'Feature',
    properties: {
      speed_kt: Math.round(speed * 10) / 10,
      u_kt: Math.round(u * 10) / 10,
      v_kt: Math.round(v * 10) / 10,
      timestamp: field.timestamp,
    },
    geometry: {
      type: 'MultiLineString',
      coordinates: [[start, end], [end, headLeft], [end, headRight]],
    },
  };
}

export function buildWindArrowCollection(field: WindField): WindArrowCollection {
  const [west, south, east, north] = field.bbox;
  const features: Array<Feature<MultiLineString, WindArrowProperties>> = [];

  for (let row = 0; row < FALLBACK_ROWS; row += 1) {
    const latitude = north - ((row + 0.5) / FALLBACK_ROWS) * (north - south);

    for (let column = 0; column < FALLBACK_COLUMNS; column += 1) {
      const longitude = west + ((column + 0.5) / FALLBACK_COLUMNS) * (east - west);
      features.push(createArrowFeature(field, longitude, latitude));
    }
  }

  return { type: 'FeatureCollection', features };
}

function createFallbackLayer(visible: boolean): MapLayerDefinition {
  return {
    id: WIND_FALLBACK_LAYER_ID,
    type: 'line',
    source: WIND_FALLBACK_SOURCE_ID,
    layout: { visibility: visible ? 'visible' : 'none' },
    paint: {
      'line-color': [
        'interpolate',
        ['linear'],
        ['get', 'speed_kt'],
        WIND_SPEED_COLOR_STOPS[0][0],
        WIND_SPEED_COLOR_STOPS[0][1],
        WIND_SPEED_COLOR_STOPS[1][0],
        WIND_SPEED_COLOR_STOPS[1][1],
        WIND_SPEED_COLOR_STOPS[2][0],
        WIND_SPEED_COLOR_STOPS[2][1],
        WIND_SPEED_COLOR_STOPS[3][0],
        WIND_SPEED_COLOR_STOPS[3][1],
        WIND_SPEED_COLOR_STOPS[4][0],
        WIND_SPEED_COLOR_STOPS[4][1],
      ],
      'line-opacity': 0.9,
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.1, 9, 2.2],
    },
  };
}

export class WindArrowFallback {
  private readonly map: MapLibreMap;
  private initialized = false;
  private destroyed = false;
  private ownsSource = false;
  private ownsLayer = false;
  private visible = false;
  private field: WindField | null = null;

  constructor(map: MapLibreMap) {
    this.map = map;
  }

  initialize(): void {
    if (this.initialized || this.destroyed) {
      return;
    }

    if (this.map.getSource(WIND_FALLBACK_SOURCE_ID) || this.map.getLayer(WIND_FALLBACK_LAYER_ID)) {
      throw new Error('Wind fallback resource identifiers are already in use.');
    }

    try {
      this.map.addSource(WIND_FALLBACK_SOURCE_ID, {
        type: 'geojson',
        data: this.field ? buildWindArrowCollection(this.field) : EMPTY_ARROW_COLLECTION,
      });
      this.ownsSource = true;
      this.map.addLayer(createFallbackLayer(this.visible));
      this.ownsLayer = true;
      this.initialized = true;
    } catch (error) {
      this.removeOwnedResources();
      throw error;
    }
  }

  setField(field: WindField): void {
    this.field = field;

    if (!this.initialized) {
      return;
    }

    const source = this.map.getSource(WIND_FALLBACK_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(buildWindArrowCollection(field));
  }

  setVisible(visible: boolean): void {
    this.visible = visible;

    if (this.initialized && this.map.getLayer(WIND_FALLBACK_LAYER_ID)) {
      const targetVisibility = visible ? 'visible' : 'none';

      if (
        this.map.getLayoutProperty(WIND_FALLBACK_LAYER_ID, 'visibility') !==
        targetVisibility
      ) {
        this.map.setLayoutProperty(
          WIND_FALLBACK_LAYER_ID,
          'visibility',
          targetVisibility,
        );
      }
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.visible = false;
    this.field = null;
    this.removeOwnedResources();
    this.initialized = false;
  }

  private removeOwnedResources(): void {
    if (this.ownsLayer && this.map.getLayer(WIND_FALLBACK_LAYER_ID)) {
      this.map.removeLayer(WIND_FALLBACK_LAYER_ID);
    }
    this.ownsLayer = false;

    if (this.ownsSource && this.map.getSource(WIND_FALLBACK_SOURCE_ID)) {
      this.map.removeSource(WIND_FALLBACK_SOURCE_ID);
    }
    this.ownsSource = false;
  }
}
