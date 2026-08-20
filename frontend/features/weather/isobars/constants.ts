import type {
  IsobarFeatureCollection,
  IsobarFrame,
  IsobarPressureHpa,
  IsobarTimestamp,
} from './types';

export const ISOBAR_SCENARIO = 'demo-colombia-001' as const;
export const ISOBAR_OVERLAY_ID = 'pressure-isobars' as const;
export const ISOBAR_OVERLAY_NAME = 'Isobaras' as const;
export const ISOBAR_UNIT = 'hPa' as const;
export const ISOBAR_CATALOG_ENDPOINT = '/api/v1/demo/weather/catalog' as const;
export const ISOBAR_BBOX = Object.freeze([-82, -5, -66, 14] as const);
export const ISOBAR_PRESSURE_LEVELS = Object.freeze([
  996,
  1000,
  1004,
  1008,
  1012,
  1016,
  1020,
  1024,
] as const satisfies ReadonlyArray<IsobarPressureHpa>);
export const ISOBAR_TIMESTAMPS = Object.freeze([
  '2026-01-15T00:00:00Z',
  '2026-01-15T03:00:00Z',
  '2026-01-15T06:00:00Z',
  '2026-01-15T09:00:00Z',
  '2026-01-15T12:00:00Z',
  '2026-01-15T15:00:00Z',
] as const satisfies ReadonlyArray<IsobarTimestamp>);

export const ISOBAR_DATA_URLS: Readonly<Record<IsobarTimestamp, string>> = Object.freeze({
  '2026-01-15T00:00:00Z': '/media/demo-weather/demo-colombia-001/pressure-isobars/00Z.geojson',
  '2026-01-15T03:00:00Z': '/media/demo-weather/demo-colombia-001/pressure-isobars/03Z.geojson',
  '2026-01-15T06:00:00Z': '/media/demo-weather/demo-colombia-001/pressure-isobars/06Z.geojson',
  '2026-01-15T09:00:00Z': '/media/demo-weather/demo-colombia-001/pressure-isobars/09Z.geojson',
  '2026-01-15T12:00:00Z': '/media/demo-weather/demo-colombia-001/pressure-isobars/12Z.geojson',
  '2026-01-15T15:00:00Z': '/media/demo-weather/demo-colombia-001/pressure-isobars/15Z.geojson',
});

export const EMPTY_ISOBAR_COLLECTION: IsobarFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export function expectedIsobarFrame(timestamp: IsobarTimestamp): IsobarFrame {
  return {
    id: ISOBAR_OVERLAY_ID,
    timestamp,
    unit: ISOBAR_UNIT,
    dataUrl: ISOBAR_DATA_URLS[timestamp],
    isSimulated: true,
    operationalUse: false,
  };
}
