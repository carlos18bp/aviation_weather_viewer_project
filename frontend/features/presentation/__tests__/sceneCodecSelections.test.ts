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
  it('accepts picker coordinates on the weather coverage boundaries', () => {
    expect(parseViewerScene('?picker=-82,-5').picker).toEqual([-82, -5]);
    expect(parseViewerScene('?picker=-66,14').picker).toEqual([-66, 14]);
  });

  it('discards malformed, non-finite and out-of-coverage pickers', () => {
    expect(parseViewerScene('?picker=-74').picker).toBeNull();
    expect(parseViewerScene('?picker=-74,4,5').picker).toBeNull();
    expect(parseViewerScene('?picker=-65,4.5').picker).toBeNull();
    expect(parseViewerScene('?picker=NaN,4.5').picker).toBeNull();
  });

  it('accepts a route between distinct frozen airports', () => {
    expect(parseViewerScene('?route=SKBO-SKRG').route).toEqual({
      originIcao: 'SKBO',
      destinationIcao: 'SKRG',
    });
  });

  it('discards equal, unknown, lowercase and malformed routes', () => {
    expect(parseViewerScene('?route=SKBO-SKBO').route).toBeNull();
    expect(parseViewerScene('?route=SKBO-XXXX').route).toBeNull();
    expect(parseViewerScene('?route=skbo-skrg').route).toBeNull();
    expect(parseViewerScene('?route=SKBO-SKRG-SKCL').route).toBeNull();
  });

  it('enables isobars and presentation only for their exact sentinel values', () => {
    expect(parseViewerScene('?isobars=1&mode=present')).toEqual(expect.objectContaining({
      isobarsVisible: true,
      presentationMode: true,
    }));
    expect(parseViewerScene('?isobars=0&mode=normal')).toEqual(expect.objectContaining({
      isobarsVisible: false,
      presentationMode: false,
    }));
  });

  it('ignores unknown parameters and uses the first duplicate value', () => {
    const scene = parseViewerScene('?unknown=x&layer=temperature&layer=wind');

    expect(scene.layer).toBe('temperature');
    expect(serializeViewerScene(scene)).not.toContain('unknown');
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
