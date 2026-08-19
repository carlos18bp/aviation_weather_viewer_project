import type { Map as MapLibreMap, MapContextEvent } from 'maplibre-gl';

import type { WindFallbackEvent, WindField } from '@/features/weather/wind';

import { CustomWindParticleLayer, WIND_PARTICLE_LAYER_ID } from './CustomWindParticleLayer';
import { WindArrowFallback } from './WindArrowFallback';
import { parseWindField } from './WindFieldParser';

export interface WindRenderer {
  initialize(): Promise<void>;
  setField(field: WindField): void;
  setVisible(visible: boolean): void;
  resize(): void;
  destroy(): void;
}

export interface WindRendererOptions {
  onFallback?: (event: WindFallbackEvent) => void;
}

type RendererMode = 'idle' | 'particles' | 'fallback';

export class MapLibreWindRenderer implements WindRenderer {
  private readonly map: MapLibreMap;
  private readonly fallback: WindArrowFallback;
  private readonly onFallback?: (event: WindFallbackEvent) => void;
  private particleLayer: CustomWindParticleLayer | null = null;
  private field: WindField | null = null;
  private visible = true;
  private mode: RendererMode = 'idle';
  private initialized = false;
  private destroyed = false;
  private listenersAttached = false;
  private animationFrame: number | null = null;
  private initialization: Promise<void> | null = null;

  constructor(map: MapLibreMap, options: WindRendererOptions = {}) {
    this.map = map;
    this.fallback = new WindArrowFallback(map);
    this.onFallback = options.onFallback;
  }

  initialize(): Promise<void> {
    if (this.destroyed) {
      return Promise.reject(new Error('Cannot initialize a destroyed wind renderer.'));
    }

    if (!this.initialization) {
      this.initialization = this.performInitialization();
    }

    return this.initialization;
  }

  setField(field: WindField): void {
    if (this.destroyed) {
      throw new Error('Cannot set a field on a destroyed wind renderer.');
    }

    const parsedField = parseWindField(field);
    this.field = parsedField;
    this.fallback.setField(parsedField);

    if (this.particleLayer && this.mode !== 'fallback') {
      try {
        this.particleLayer.setField(parsedField);
      } catch (error) {
        this.activateFallback(
          'renderer-runtime-failed',
          'El renderer WebGL no pudo reemplazar el campo de viento.',
          error,
        );
      }
    }

    this.updateActivity();
  }

  setVisible(visible: boolean): void {
    if (this.destroyed || this.visible === visible) {
      return;
    }

    this.visible = visible;
    this.updateActivity();
  }

  resize(): void {
    if (this.destroyed) {
      return;
    }

    this.particleLayer?.resize();
    this.map.triggerRepaint();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.visible = false;
    this.stopAnimation();
    this.detachListeners();
    this.particleLayer?.setActive(false);

    if (this.map.getLayer(WIND_PARTICLE_LAYER_ID)) {
      this.map.removeLayer(WIND_PARTICLE_LAYER_ID);
    }

    this.particleLayer = null;
    this.fallback.destroy();
    this.field = null;
    this.mode = 'idle';
    this.initialized = false;
  }

  private async performInitialization(): Promise<void> {
    if (!this.map.isStyleLoaded()) {
      await this.map.once('style.load');
    }

    if (this.destroyed) {
      return;
    }

    this.fallback.initialize();
    this.attachListeners();

    const webgl2 = this.map.getCanvas().getContext('webgl2');

    if (!webgl2) {
      this.initialized = true;
      this.activateFallback(
        'webgl2-unavailable',
        'WebGL2 no está disponible; se muestran flechas de viento estáticas.',
      );
      return;
    }

    const particleLayer = new CustomWindParticleLayer((error) => {
      this.activateFallback(
        'renderer-runtime-failed',
        'El renderer WebGL falló durante la animación.',
        error,
      );
    });
    this.particleLayer = particleLayer;

    try {
      this.map.addLayer(particleLayer);
      if (this.field) {
        particleLayer.setField(this.field);
      }
      this.mode = 'particles';
      this.fallback.setVisible(false);
    } catch (error) {
      if (this.map.getLayer(WIND_PARTICLE_LAYER_ID)) {
        this.map.removeLayer(WIND_PARTICLE_LAYER_ID);
      }
      this.particleLayer = null;
      this.activateFallback(
        'renderer-initialization-failed',
        'El renderer WebGL no pudo inicializarse; se muestran flechas estáticas.',
        error,
      );
    }

    this.initialized = true;
    this.updateActivity();
  }

  private readonly handleVisibilityChange = (): void => {
    this.updateActivity();
  };

  private readonly handleContextLost = (event: MapContextEvent): void => {
    event.originalEvent?.preventDefault();
    this.activateFallback(
      'webgl-context-lost',
      'Se perdió el contexto WebGL; se mantienen flechas de viento estáticas.',
      event,
    );
  };

  private readonly handleContextRestored = (): void => {
    if (this.mode === 'fallback') {
      this.fallback.setVisible(this.visible && Boolean(this.field));
      this.map.triggerRepaint();
    }
  };

  private readonly handleIdle = (): void => {
    if (this.mode === 'fallback') {
      this.fallback.setVisible(this.visible && Boolean(this.field));
    }
  };

  private attachListeners(): void {
    if (this.listenersAttached) {
      return;
    }

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.map.on('webglcontextlost', this.handleContextLost);
    this.map.on('webglcontextrestored', this.handleContextRestored);
    this.map.on('idle', this.handleIdle);
    this.listenersAttached = true;
  }

  private detachListeners(): void {
    if (!this.listenersAttached) {
      return;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.map.off('webglcontextlost', this.handleContextLost);
    this.map.off('webglcontextrestored', this.handleContextRestored);
    this.map.off('idle', this.handleIdle);
    this.listenersAttached = false;
  }

  private activateFallback(
    code: WindFallbackEvent['code'],
    message: string,
    cause?: unknown,
  ): void {
    if (this.destroyed) {
      return;
    }

    this.mode = 'fallback';
    this.particleLayer?.setActive(false);
    this.stopAnimation();

    if (this.map.getLayer(WIND_PARTICLE_LAYER_ID)) {
      this.map.removeLayer(WIND_PARTICLE_LAYER_ID);
    }
    this.particleLayer = null;
    this.fallback.setVisible(this.visible && Boolean(this.field));
    this.onFallback?.({ code, message, cause });
  }

  private updateActivity(): void {
    if (!this.initialized || this.destroyed) {
      return;
    }

    if (this.mode === 'fallback') {
      this.stopAnimation();
      this.fallback.setVisible(this.visible && Boolean(this.field));
      return;
    }

    const particlesActive =
      this.mode === 'particles' &&
      this.visible &&
      Boolean(this.field) &&
      !document.hidden;
    this.particleLayer?.setActive(particlesActive);
    this.fallback.setVisible(false);

    if (particlesActive) {
      this.startAnimation();
    } else {
      this.stopAnimation();
    }
  }

  private startAnimation(): void {
    if (this.animationFrame !== null || this.destroyed) {
      return;
    }

    this.animationFrame = window.requestAnimationFrame(() => {
      this.animationFrame = null;

      if (
        !this.destroyed &&
        this.mode === 'particles' &&
        this.visible &&
        Boolean(this.field) &&
        !document.hidden
      ) {
        this.map.triggerRepaint();
        this.startAnimation();
      }
    });
  }

  private stopAnimation(): void {
    if (this.animationFrame === null) {
      return;
    }

    window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }
}

export function createWindRenderer(
  map: MapLibreMap,
  options: WindRendererOptions = {},
): WindRenderer {
  return new MapLibreWindRenderer(map, options);
}
