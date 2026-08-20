import type { ViewerScene } from '../sceneTypes';
import { parseViewerScene, serializeViewerScene } from '../sceneCodec';
import { DEFAULT_VIEWER_SCENE } from '../sceneTypes';


function completeScene(overrides: Partial<ViewerScene> = {}): ViewerScene {
  return {
    ...DEFAULT_VIEWER_SCENE,
    viewport: { ...DEFAULT_VIEWER_SCENE.viewport },
    ...overrides,
  };
}

describe('viewer scene selections and canonical serialization', () => {
  it('accepts picker coordinates on meteorological boundaries', () => {
    expect(parseViewerScene('?picker=-82,-5').picker).toEqual([-82, -5]);
    expect(parseViewerScene('?picker=-66,14').picker).toEqual([-66, 14]);
  });

  it.each([
    '-74',
    '-74,4,5',
    '-65,4.5',
    'NaN,4.5',
  ])('discards invalid picker %s', (picker) => {
    const scene = parseViewerScene(`?picker=${picker}`);

    expect(scene.picker).toBeNull();
    expect(scene.layer).toBe('wind');
  });

  it('accepts a route between distinct frozen airports', () => {
    expect(parseViewerScene('?route=SKBO-SKRG').route).toEqual({
      originIcao: 'SKBO',
      destinationIcao: 'SKRG',
    });
  });

  it.each([
    'SKBO-SKBO',
    'SKBO-XXXX',
    'skbo-skrg',
    'SKBO-SKRG-SKCL',
  ])('discards invalid route %s', (route) => {
    const scene = parseViewerScene(`?route=${route}`);

    expect(scene.route).toBeNull();
    expect(scene.timestamp).toBe(DEFAULT_VIEWER_SCENE.timestamp);
  });

  it('enables isobars for its exact sentinel value', () => {
    expect(parseViewerScene('?isobars=1').isobarsVisible).toBe(true);
    expect(parseViewerScene('?isobars=0').isobarsVisible).toBe(false);
  });

  it('enables presentation for its exact sentinel value', () => {
    expect(parseViewerScene('?mode=present').presentationMode).toBe(true);
    expect(parseViewerScene('?mode=normal').presentationMode).toBe(false);
  });

  it('removes unknown parameters from canonical output', () => {
    const scene = parseViewerScene('?unknown=x&layer=temperature');

    expect(serializeViewerScene(scene)).toBe('?layer=temperature');
  });

  it('uses the first duplicate parameter value', () => {
    expect(parseViewerScene('?layer=temperature&layer=wind').layer).toBe('temperature');
  });

  it('omits every default and null field', () => {
    expect(serializeViewerScene(completeScene())).toBe('');
  });

  it('serializes the full scene in canonical order and precision', () => {
    expect(serializeViewerScene(completeScene({
      layer: 'precipitation',
      timestamp: '2026-01-15T15:00:00Z',
      viewport: { latitude: 4.704, longitude: -74.153, zoom: 6.24 },
      airport: 'SKBO',
      picker: [-74.153, 4.704],
      route: { originIcao: 'SKBO', destinationIcao: 'SKRG' },
      isobarsVisible: true,
      presentationMode: true,
    }))).toBe(
      '?layer=precipitation&t=15Z&lat=4.70&lon=-74.15&z=6.2'
      + '&airport=SKBO&picker=-74.15,4.70&route=SKBO-SKRG&isobars=1&mode=present',
    );
  });

  it('normalizes invalid runtime data instead of serializing unsafe values', () => {
    const invalid = completeScene({
      viewport: { latitude: Number.NaN, longitude: -90, zoom: 10 },
      picker: [-65, 4.5],
      route: { originIcao: 'SKBO', destinationIcao: 'SKBO' },
    });

    expect(serializeViewerScene(invalid)).toBe('');
  });

  it('round-trips a normalized scene without changing its meaning', () => {
    const scene = completeScene({
      layer: 'temperature',
      timestamp: '2026-01-15T09:00:00Z',
      viewport: { latitude: 6.25, longitude: -75.57, zoom: 7.1 },
      airport: 'SKRG',
      picker: [-75.57, 6.25],
      route: { originIcao: 'SKRG', destinationIcao: 'SKCL' },
      isobarsVisible: true,
      presentationMode: true,
    });

    const serialized = serializeViewerScene(scene);
    expect(parseViewerScene(serialized)).toEqual(scene);
    expect(serializeViewerScene(parseViewerScene(serialized))).toBe(serialized);
  });
});
