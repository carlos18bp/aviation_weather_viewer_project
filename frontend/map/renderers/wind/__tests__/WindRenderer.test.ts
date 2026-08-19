import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

import { WIND_FIELD_FIXTURE } from '@/features/weather/wind';
import {
  WIND_FALLBACK_LAYER_ID,
  WIND_FALLBACK_SOURCE_ID,
} from '@/map/renderers/wind/WindArrowFallback';
import { WIND_PARTICLE_LAYER_ID } from '@/map/renderers/wind/CustomWindParticleLayer';
import { MapLibreWindRenderer } from '@/map/renderers/wind/WindRenderer';

interface FakeSource extends Partial<GeoJSONSource> {
  setData: jest.Mock;
}

interface FakeMapHarness {
  map: MapLibreMap;
  layers: Map<string, Record<string, unknown>>;
  layouts: Map<string, Map<string, unknown>>;
  sources: Map<string, FakeSource>;
  handlers: Map<string, Set<(event: any) => void>>;
  emit: (eventName: string, event?: any) => void;
}

function createFakeMap(options: { webgl2?: boolean; failParticles?: boolean } = {}): FakeMapHarness {
  const layers = new Map<string, Record<string, unknown>>();
  const sources = new Map<string, FakeSource>();
  const layouts = new Map<string, Map<string, unknown>>();
  const handlers = new Map<string, Set<(event: any) => void>>();
  const webgl2 = options.webgl2 ?? true;
  const map = {
    isStyleLoaded: jest.fn(() => true),
    once: jest.fn(() => Promise.resolve()),
    getCanvas: jest.fn(() => ({
      getContext: jest.fn(() => (webgl2 ? {} : null)),
    })),
    addSource: jest.fn((id: string) => {
      sources.set(id, { setData: jest.fn() });
    }),
    getSource: jest.fn((id: string) => sources.get(id)),
    removeSource: jest.fn((id: string) => {
      sources.delete(id);
    }),
    addLayer: jest.fn((layer: Record<string, unknown>) => {
      if (options.failParticles && layer.type === 'custom') {
        throw new Error('shader failed');
      }
      layers.set(layer.id as string, layer);
      layouts.set(
        layer.id as string,
        new Map(Object.entries((layer.layout as Record<string, unknown> | undefined) ?? {})),
      );
    }),
    getLayer: jest.fn((id: string) => layers.get(id)),
    removeLayer: jest.fn((id: string) => {
      layers.delete(id);
      layouts.delete(id);
    }),
    getLayoutProperty: jest.fn((id: string, property: string) => layouts.get(id)?.get(property)),
    setLayoutProperty: jest.fn((id: string, property: string, value: unknown) => {
      layouts.get(id)?.set(property, value);
    }),
    triggerRepaint: jest.fn(),
    on: jest.fn((eventName: string, handler: (event: any) => void) => {
      const eventHandlers = handlers.get(eventName) ?? new Set();
      eventHandlers.add(handler);
      handlers.set(eventName, eventHandlers);
    }),
    off: jest.fn((eventName: string, handler: (event: any) => void) => {
      handlers.get(eventName)?.delete(handler);
    }),
  };

  return {
    map: map as unknown as MapLibreMap,
    layers,
    layouts,
    sources,
    handlers,
    emit: (eventName, event = {}) => {
      handlers.get(eventName)?.forEach((handler) => handler(event));
    },
  };
}

describe('MapLibre wind renderer', () => {
  let animationCallbacks: Map<number, FrameRequestCallback>;
  let nextAnimationId: number;
  let activeRenderers: MapLibreWindRenderer[];

  const trackRenderer = (renderer: MapLibreWindRenderer): MapLibreWindRenderer => {
    activeRenderers.push(renderer);
    return renderer;
  };

  beforeEach(() => {
    activeRenderers = [];
    animationCallbacks = new Map();
    nextAnimationId = 1;
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: jest.fn((callback: FrameRequestCallback) => {
        const id = nextAnimationId;
        nextAnimationId += 1;
        animationCallbacks.set(id, callback);
        return id;
      }),
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: jest.fn((id: number) => {
        animationCallbacks.delete(id);
      }),
    });
  });

  afterEach(() => {
    activeRenderers.forEach((renderer) => renderer.destroy());
    jest.restoreAllMocks();
  });

  it('adds isolated wind resources', async () => {
    const harness = createFakeMap();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map));

    await renderer.initialize();

    expect(harness.sources.has(WIND_FALLBACK_SOURCE_ID)).toBe(true);
    expect(harness.layers.has(WIND_FALLBACK_LAYER_ID)).toBe(true);
    expect(harness.layers.has(WIND_PARTICLE_LAYER_ID)).toBe(true);
  });

  it('publishes interpretable fallback arrows', async () => {
    const harness = createFakeMap();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map));
    await renderer.initialize();

    renderer.setField(WIND_FIELD_FIXTURE);

    const source = harness.sources.get(WIND_FALLBACK_SOURCE_ID);
    const collection = source?.setData.mock.calls[0][0];
    expect(collection.features).toHaveLength(80);
    expect(collection.features[0].geometry.coordinates).toHaveLength(3);
    expect(collection.features[0].properties.speed_kt).toBeGreaterThan(0);
  });

  it('preserves the active field after invalid input', async () => {
    const harness = createFakeMap();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map));
    await renderer.initialize();
    renderer.setField(WIND_FIELD_FIXTURE);
    const source = harness.sources.get(WIND_FALLBACK_SOURCE_ID);

    expect(() => renderer.setField({ ...WIND_FIELD_FIXTURE, u: [] })).toThrow();
    expect(source?.setData).toHaveBeenCalledTimes(1);
  });

  it('pauses animation while hidden', async () => {
    const harness = createFakeMap();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map));
    await renderer.initialize();
    renderer.setField(WIND_FIELD_FIXTURE);

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(animationCallbacks.size).toBe(0);
  });

  it('resumes animation after visibility returns', async () => {
    const harness = createFakeMap();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map));
    await renderer.initialize();
    renderer.setField(WIND_FIELD_FIXTURE);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(animationCallbacks.size).toBe(1);
  });

  it('stops animation when layer is hidden', async () => {
    const harness = createFakeMap();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map));
    await renderer.initialize();
    renderer.setField(WIND_FIELD_FIXTURE);

    renderer.setVisible(false);

    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('requests repaint after resize', async () => {
    const harness = createFakeMap();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map));
    await renderer.initialize();

    renderer.resize();

    expect(harness.map.triggerRepaint).toHaveBeenCalledTimes(1);
  });

  it('activates fallback after initialization failure', async () => {
    const harness = createFakeMap({ failParticles: true });
    const onFallback = jest.fn();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map, { onFallback }));
    renderer.setField(WIND_FIELD_FIXTURE);

    await renderer.initialize();

    expect(onFallback).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'renderer-initialization-failed' }),
    );
    expect(harness.map.setLayoutProperty).toHaveBeenLastCalledWith(
      WIND_FALLBACK_LAYER_ID,
      'visibility',
      'visible',
    );
  });

  it('activates fallback after context loss', async () => {
    const harness = createFakeMap();
    const onFallback = jest.fn();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map, { onFallback }));
    await renderer.initialize();
    renderer.setField(WIND_FIELD_FIXTURE);
    const preventDefault = jest.fn();

    harness.emit('webglcontextlost', { originalEvent: { preventDefault } });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'webgl-context-lost' }),
    );
  });

  it('restores fallback visibility after style recovery', async () => {
    const harness = createFakeMap();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map));
    await renderer.initialize();
    renderer.setField(WIND_FIELD_FIXTURE);
    harness.emit('webglcontextlost', { originalEvent: { preventDefault: jest.fn() } });
    harness.layouts.get(WIND_FALLBACK_LAYER_ID)?.set('visibility', 'none');

    harness.emit('idle');

    expect(harness.map.setLayoutProperty).toHaveBeenLastCalledWith(
      WIND_FALLBACK_LAYER_ID,
      'visibility',
      'visible',
    );
  });

  it('cleans resources after repeated destroy', async () => {
    const harness = createFakeMap();
    const renderer = trackRenderer(new MapLibreWindRenderer(harness.map));
    await renderer.initialize();
    renderer.setField(WIND_FIELD_FIXTURE);

    renderer.destroy();
    renderer.destroy();

    expect(harness.map.removeLayer).toHaveBeenCalledTimes(2);
    expect(harness.map.removeSource).toHaveBeenCalledTimes(1);
    expect(harness.map.off).toHaveBeenCalledTimes(3);
    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
  });
});
