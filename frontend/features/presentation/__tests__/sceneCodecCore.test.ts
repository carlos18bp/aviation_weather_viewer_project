import { DEMO_AIRPORT_ICAO_CODES, DEMO_TIMESTAMPS } from '@/features/airports';

import { parseViewerScene } from '../sceneCodec';
import { DEFAULT_VIEWER_SCENE } from '../sceneTypes';


describe('parseViewerScene core parameters', () => {
  it('returns an independent safe default scene for an empty query', () => {
    const scene = parseViewerScene('');

    expect(scene).toEqual(DEFAULT_VIEWER_SCENE);
    expect(scene).not.toBe(DEFAULT_VIEWER_SCENE);
    expect(scene.viewport).not.toBe(DEFAULT_VIEWER_SCENE.viewport);
  });

  it('accepts every final layer value without activating it', () => {
    for (const layer of ['wind', 'temperature', 'precipitation'] as const) {
      expect(parseViewerScene(`?layer=${layer}`).layer).toBe(layer);
    }
  });

  it('defaults unknown or differently-cased layers to wind', () => {
    expect(parseViewerScene('?layer=radar').layer).toBe('wind');
    expect(parseViewerScene('?layer=Temperature').layer).toBe('wind');
  });

  it.each([
    ['00Z', DEMO_TIMESTAMPS[0]],
    ['03Z', DEMO_TIMESTAMPS[1]],
    ['06Z', DEMO_TIMESTAMPS[2]],
    ['09Z', DEMO_TIMESTAMPS[3]],
    ['12Z', DEMO_TIMESTAMPS[4]],
    ['15Z', DEMO_TIMESTAMPS[5]],
  ])('maps timestamp query %s to its frozen ISO value', (query, timestamp) => {
    expect(parseViewerScene(`?t=${query}`).timestamp).toBe(timestamp);
  });

  it('defaults malformed, external and full ISO timestamp values to 06Z', () => {
    expect(parseViewerScene('?t=18Z').timestamp).toBe(DEFAULT_VIEWER_SCENE.timestamp);
    expect(parseViewerScene(`?t=${DEMO_TIMESTAMPS[0]}`).timestamp).toBe(
      DEFAULT_VIEWER_SCENE.timestamp,
    );
  });

  it('accepts viewport boundary values independently', () => {
    expect(parseViewerScene('?lat=-7&lon=-84&z=4').viewport).toEqual({
      latitude: -7,
      longitude: -84,
      zoom: 4,
    });
    expect(parseViewerScene('?lat=16&lon=-64&z=9').viewport).toEqual({
      latitude: 16,
      longitude: -64,
      zoom: 9,
    });
  });

  it('defaults only invalid viewport fields, including non-finite and non-decimal values', () => {
    expect(parseViewerScene('?lat=17&lon=-74.15&z=Infinity').viewport).toEqual({
      latitude: DEFAULT_VIEWER_SCENE.viewport.latitude,
      longitude: -74.15,
      zoom: DEFAULT_VIEWER_SCENE.viewport.zoom,
    });
    expect(parseViewerScene('?lat=NaN&lon=0x10&z=3.9').viewport).toEqual(
      DEFAULT_VIEWER_SCENE.viewport,
    );
  });

  it('accepts all six frozen airport codes', () => {
    for (const airport of DEMO_AIRPORT_ICAO_CODES) {
      expect(parseViewerScene(`?airport=${airport}`).airport).toBe(airport);
    }
  });

  it('discards unknown and lowercase airport codes', () => {
    expect(parseViewerScene('?airport=XXXX').airport).toBeNull();
    expect(parseViewerScene('?airport=skbo').airport).toBeNull();
  });
});
