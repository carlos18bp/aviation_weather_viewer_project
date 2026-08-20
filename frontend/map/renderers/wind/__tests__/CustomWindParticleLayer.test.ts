import type { CustomRenderMethodInput, Map as MapLibreMap } from 'maplibre-gl';

import { WIND_FIELD_FIXTURE } from '@/features/weather/wind';
import {
  CustomWindParticleLayer,
  DEFAULT_WIND_PARTICLE_COUNT,
} from '@/map/renderers/wind/CustomWindParticleLayer';

import { createFakeWindWebGl } from './webglHarness';

const RENDER_OPTIONS = {
  modelViewProjectionMatrix: new Float32Array(16),
} as unknown as CustomRenderMethodInput;

const MAP = {
  getZoom: jest.fn(() => 4.7),
} as unknown as MapLibreMap;

describe('CustomWindParticleLayer adaptive buffers', () => {
  it('keeps 2500 as the compatible default and accepts an explicit count', () => {
    const fallback = new CustomWindParticleLayer(jest.fn());
    const phone = new CustomWindParticleLayer(jest.fn(), { particleCount: 900 });

    expect(fallback.getParticleCount()).toBe(DEFAULT_WIND_PARTICLE_COUNT);
    expect(phone.getParticleCount()).toBe(900);
  });

  it('replaces particle buffers without uploading the U/V field again', () => {
    const harness = createFakeWindWebGl();
    const layer = new CustomWindParticleLayer(jest.fn());
    layer.onAdd(MAP, harness.gl);
    layer.setField(WIND_FIELD_FIXTURE);
    const previousParticleBuffers = harness.createdBuffers.slice(1, 5);

    layer.setParticleCount(540);

    expect(layer.getParticleCount()).toBe(540);
    expect(harness.texImage2D).toHaveBeenCalledTimes(1);
    expect(harness.deleteBuffer).toHaveBeenCalledTimes(4);
    expect(harness.deleteBuffer.mock.calls.map(([buffer]) => buffer)).toEqual(
      expect.arrayContaining(previousParticleBuffers),
    );
    expect(harness.bufferData.mock.calls.slice(-4).map(([, data]) => data.length)).toEqual([
      1_080,
      540,
      1_080,
      540,
    ]);
  });

  it('cleans a partial allocation while retaining the previous particle set', () => {
    const harness = createFakeWindWebGl();
    const layer = new CustomWindParticleLayer(jest.fn());
    layer.onAdd(MAP, harness.gl);
    const previousParticleBuffers = harness.createdBuffers.slice(1, 5);
    harness.failBufferAllocationAfter(2);

    expect(() => layer.setParticleCount(1_500)).toThrow(
      'Unable to allocate a wind WebGL buffer.',
    );

    const partialBuffer = harness.createdBuffers.at(-1);
    expect(layer.getParticleCount()).toBe(2_500);
    expect(harness.deleteBuffer).toHaveBeenCalledTimes(1);
    expect(harness.deleteBuffer).toHaveBeenCalledWith(partialBuffer);
    previousParticleBuffers.forEach((buffer) => {
      expect(harness.deleteBuffer).not.toHaveBeenCalledWith(buffer);
    });
  });

  it('draws and reports exactly the configured number of particles', () => {
    const harness = createFakeWindWebGl();
    const onFrameRendered = jest.fn();
    const layer = new CustomWindParticleLayer(jest.fn(), {
      particleCount: 900,
      now: () => 100,
      onFrameRendered,
    });
    layer.onAdd(MAP, harness.gl);
    layer.setField(WIND_FIELD_FIXTURE);
    layer.setActive(true);

    layer.render(harness.gl, RENDER_OPTIONS);

    expect(harness.drawArrays).toHaveBeenCalledWith(harness.gl.POINTS, 0, 900);
    expect(harness.drawArraysInstanced).toHaveBeenCalledWith(
      harness.gl.LINES,
      0,
      2,
      900,
    );
    expect(onFrameRendered).toHaveBeenCalledWith(100);
  });

  it('releases buffers, texture, programs, and vertex resources idempotently', () => {
    const harness = createFakeWindWebGl();
    const layer = new CustomWindParticleLayer(jest.fn());
    layer.onAdd(MAP, harness.gl);

    layer.onRemove();
    layer.onRemove();

    expect(harness.deleteBuffer).toHaveBeenCalledTimes(5);
    expect((harness.gl.deleteTexture as jest.Mock)).toHaveBeenCalledTimes(1);
    expect((harness.gl.deleteProgram as jest.Mock)).toHaveBeenCalledTimes(2);
    expect((harness.gl.deleteVertexArray as jest.Mock)).toHaveBeenCalledTimes(3);
    expect((harness.gl.deleteTransformFeedback as jest.Mock)).toHaveBeenCalledTimes(2);
  });
});
