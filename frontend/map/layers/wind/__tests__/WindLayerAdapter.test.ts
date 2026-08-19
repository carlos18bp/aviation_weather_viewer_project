import type { Map as MapLibreMap } from 'maplibre-gl';

import { WIND_FIELD_FIXTURE } from '@/features/weather/wind';
import { WindLayerAdapter } from '@/map/layers/wind/WindLayerAdapter';
import {
  createWindRenderer,
  type WindRenderer,
} from '@/map/renderers/wind/WindRenderer';

jest.mock('@/map/renderers/wind/WindRenderer', () => ({
  createWindRenderer: jest.fn(),
}));

const mockedCreateWindRenderer = jest.mocked(createWindRenderer);

function rendererDouble(): jest.Mocked<WindRenderer> {
  return {
    initialize: jest.fn(() => Promise.resolve()),
    setField: jest.fn(),
    setVisible: jest.fn(),
    resize: jest.fn(),
    destroy: jest.fn(),
  };
}

describe('Wind layer adapter', () => {
  let renderer: jest.Mocked<WindRenderer>;
  let map: MapLibreMap;

  beforeEach(() => {
    renderer = rendererDouble();
    map = {} as MapLibreMap;
    mockedCreateWindRenderer.mockReturnValue(renderer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses the frozen wind identifier', () => {
    const adapter = new WindLayerAdapter(map);

    expect(adapter.id).toBe('wind');
  });

  it('passes fallback observer to renderer', () => {
    const onFallback = jest.fn();

    new WindLayerAdapter(map, { onFallback });

    expect(mockedCreateWindRenderer).toHaveBeenCalledWith(map, { onFallback });
  });

  it('delegates initialization', async () => {
    const adapter = new WindLayerAdapter(map);

    await adapter.initialize();

    expect(renderer.initialize).toHaveBeenCalledTimes(1);
  });

  it('delegates frame replacement', () => {
    const adapter = new WindLayerAdapter(map);

    adapter.setFrame(WIND_FIELD_FIXTURE);

    expect(renderer.setField).toHaveBeenCalledWith(WIND_FIELD_FIXTURE);
  });

  it('delegates visibility', () => {
    const adapter = new WindLayerAdapter(map);

    adapter.setVisible(false);

    expect(renderer.setVisible).toHaveBeenCalledWith(false);
  });

  it('delegates resize', () => {
    const adapter = new WindLayerAdapter(map);

    adapter.resize();

    expect(renderer.resize).toHaveBeenCalledTimes(1);
  });

  it('replays the current field during reset', () => {
    const adapter = new WindLayerAdapter(map);
    adapter.setFrame(WIND_FIELD_FIXTURE);

    adapter.reset();

    expect(renderer.setField).toHaveBeenCalledTimes(2);
    expect(renderer.setField).toHaveBeenLastCalledWith(WIND_FIELD_FIXTURE);
  });

  it('keeps prior field after replacement failure', () => {
    const adapter = new WindLayerAdapter(map);
    adapter.setFrame(WIND_FIELD_FIXTURE);
    renderer.setField.mockImplementationOnce(() => {
      throw new Error('invalid field');
    });

    expect(() => adapter.setFrame({ ...WIND_FIELD_FIXTURE, u: [] })).toThrow('invalid field');
    adapter.reset();
    expect(renderer.setField).toHaveBeenLastCalledWith(WIND_FIELD_FIXTURE);
  });

  it('ignores reset before a frame exists', () => {
    const adapter = new WindLayerAdapter(map);

    adapter.reset();

    expect(renderer.setField).not.toHaveBeenCalled();
  });

  it('destroys renderer once', () => {
    const adapter = new WindLayerAdapter(map);

    adapter.destroy();
    adapter.destroy();

    expect(renderer.destroy).toHaveBeenCalledTimes(1);
  });

  it('rejects frames after destroy', () => {
    const adapter = new WindLayerAdapter(map);
    adapter.destroy();

    expect(() => adapter.setFrame(WIND_FIELD_FIXTURE)).toThrow(
      'Cannot set a frame on a destroyed wind adapter.',
    );
  });
});
