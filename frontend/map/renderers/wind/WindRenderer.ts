import type { Map as MapLibreMap, MapContextEvent } from 'maplibre-gl';

import {
  createAdaptiveRenderingController,
  createMatchMediaWindRenderProfileSelector,
  MAXIMUM_MEASURED_FRAME_GAP_MS,
  WIND_RENDER_PROFILES,
  type AdaptiveRenderingController,
  type VisibilityDocument,
  type WindRenderProfile,
  type WindRenderProfileSelector,
} from '@/features/performance';
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

export interface AdaptiveWindRendererOptions {
  selectProfile?: WindRenderProfileSelector;
  lowFpsThreshold?: number;
  lowFpsWindowMs?: number;
  now?: () => number;
  document?: VisibilityDocument | null;
  onProfileChange?(profile: Readonly<WindRenderProfile>): void;
  onDocumentVisibilityChange?(visible: boolean): void;
}

export interface WindRendererOptions {
  onFallback?: (event: WindFallbackEvent) => void;
  adaptiveRendering?: AdaptiveWindRendererOptions;
}

type RendererMode = 'idle' | 'particles' | 'fallback';

function defaultNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function selectInitialProfile(
  selector: WindRenderProfileSelector,
): Readonly<WindRenderProfile> {
  try {
    const selected = selector();
    if (selected.id === 'phone' || selected.id === 'tablet' || selected.id === 'desktop') {
      return WIND_RENDER_PROFILES[selected.id];
    }
  } catch {
    // Capability detection failure intentionally uses the conservative profile.
  }
  return WIND_RENDER_PROFILES.phone;
}

export class MapLibreWindRenderer implements WindRenderer {
  private readonly map: MapLibreMap;
  private readonly fallback: WindArrowFallback;
  private readonly onFallback?: (event: WindFallbackEvent) => void;
  private readonly onProfileChange?: AdaptiveWindRendererOptions['onProfileChange'];
  private readonly onDocumentVisibilityChange?: (
    visible: boolean,
  ) => void;
  private readonly now: () => number;
  private readonly adaptiveController: AdaptiveRenderingController;
  private particleLayer: CustomWindParticleLayer | null = null;
  private field: WindField | null = null;
  private profile: Readonly<WindRenderProfile>;
  private visible = true;
  private documentVisible = true;
  private hiddenAtMs: number | null = null;
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
    const adaptiveOptions = options.adaptiveRendering ?? {};
    this.onProfileChange = adaptiveOptions.onProfileChange;
    this.onDocumentVisibilityChange = adaptiveOptions.onDocumentVisibilityChange;
    this.now = adaptiveOptions.now ?? defaultNow;
    this.profile = selectInitialProfile(
      adaptiveOptions.selectProfile ?? createMatchMediaWindRenderProfileSelector(),
    );
    this.adaptiveController = createAdaptiveRenderingController({
      initialProfile: this.profile.id as 'phone' | 'tablet' | 'desktop',
      lowFpsThreshold: adaptiveOptions.lowFpsThreshold,
      lowFpsWindowMs: adaptiveOptions.lowFpsWindowMs,
      now: this.now,
      document: adaptiveOptions.document,
      onProfileChange: (profile) => this.applyAdaptiveProfile(profile),
      onDocumentVisibilityChange: (visible) => this.handleDocumentVisibility(visible),
    });
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
    this.adaptiveController.setRenderingActive(false);
    this.adaptiveController.destroy();
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
      this.adaptiveController.start();
      this.publishProfile(this.profile);
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
    }, {
      particleCount: this.profile.particleCount,
      now: this.now,
      onFrameRendered: (timestampMs) => this.adaptiveController.recordFrame(timestampMs),
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
    this.adaptiveController.start();
    this.publishProfile(this.profile);
    this.updateActivity();
  }

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

    this.map.on('webglcontextlost', this.handleContextLost);
    this.map.on('webglcontextrestored', this.handleContextRestored);
    this.map.on('idle', this.handleIdle);
    this.listenersAttached = true;
  }

  private detachListeners(): void {
    if (!this.listenersAttached) {
      return;
    }

    this.map.off('webglcontextlost', this.handleContextLost);
    this.map.off('webglcontextrestored', this.handleContextRestored);
    this.map.off('idle', this.handleIdle);
    this.listenersAttached = false;
  }

  private handleDocumentVisibility(visible: boolean): void {
    const timestampMs = this.now();
    this.documentVisible = visible;
    if (!visible) {
      this.hiddenAtMs = timestampMs;
    } else {
      const hiddenDurationMs = this.hiddenAtMs === null
        ? 0
        : timestampMs - this.hiddenAtMs;
      this.hiddenAtMs = null;
      if (
        hiddenDurationMs > MAXIMUM_MEASURED_FRAME_GAP_MS
        && this.mode === 'particles'
        && this.particleLayer
      ) {
        try {
          this.particleLayer.resetParticleBuffers();
        } catch (error) {
          this.activateFallback(
            'renderer-runtime-failed',
            'El renderer WebGL no pudo reanudar sus partículas; se muestran flechas estáticas.',
            error,
          );
        }
      }
    }

    this.updateActivity();
    this.onDocumentVisibilityChange?.(visible);
  }

  private applyAdaptiveProfile(profile: Readonly<WindRenderProfile>): void {
    if (this.destroyed) {
      return;
    }

    try {
      this.particleLayer?.setParticleCount(profile.particleCount);
    } catch (error) {
      this.activateFallback(
        'renderer-runtime-failed',
        'El renderer WebGL no pudo reducir sus partículas; se muestran flechas estáticas.',
        error,
      );
    }
    this.profile = profile;
    this.publishProfile(profile);
  }

  private publishProfile(profile: Readonly<WindRenderProfile>): void {
    this.onProfileChange?.(profile);
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
    this.adaptiveController.setRenderingActive(false);
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
      this.adaptiveController.setRenderingActive(false);
      this.stopAnimation();
      this.fallback.setVisible(this.visible && Boolean(this.field));
      return;
    }

    const particlesActive =
      this.mode === 'particles'
      && this.visible
      && Boolean(this.field)
      && this.documentVisible;
    this.adaptiveController.setRenderingActive(particlesActive);
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
        !this.destroyed
        && this.mode === 'particles'
        && this.visible
        && Boolean(this.field)
        && this.documentVisible
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
