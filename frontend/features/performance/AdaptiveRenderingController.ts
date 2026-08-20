import {
  createTemporalFpsMonitor,
  DEFAULT_LOW_FPS_THRESHOLD,
  DEFAULT_LOW_FPS_WINDOW_MS,
  type TemporalFpsMonitor,
} from './TemporalFpsMonitor';
import {
  createDegradedWindRenderProfile,
  WIND_RENDER_PROFILES,
  type InitialWindRenderProfileId,
  type WindRenderProfile,
} from './windRenderProfiles';

export interface VisibilityDocument {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', listener: EventListener): void;
  removeEventListener(type: 'visibilitychange', listener: EventListener): void;
}

export interface AdaptiveRenderingOptions {
  initialProfile: InitialWindRenderProfileId;
  lowFpsThreshold?: number;
  lowFpsWindowMs?: number;
  now?: () => number;
  document?: VisibilityDocument | null;
  onProfileChange?(profile: Readonly<WindRenderProfile>): void;
  onDocumentVisibilityChange?(visible: boolean): void;
}

export interface AdaptiveRenderingController {
  start(): void;
  recordFrame(timestampMs?: number): void;
  setRenderingActive(active: boolean): void;
  setDocumentVisible(visible: boolean): void;
  currentProfile(): Readonly<WindRenderProfile>;
  destroy(): void;
}

function defaultNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function browserDocument(): VisibilityDocument | null {
  return typeof document === 'undefined' ? null : document;
}

class DefaultAdaptiveRenderingController implements AdaptiveRenderingController {
  private readonly initialProfile: Readonly<WindRenderProfile>;
  private readonly monitor: TemporalFpsMonitor;
  private readonly now: () => number;
  private readonly visibilityDocument: VisibilityDocument | null;
  private readonly onProfileChange?: AdaptiveRenderingOptions['onProfileChange'];
  private readonly onDocumentVisibilityChange?: (
    visible: boolean,
  ) => void;
  private profile: Readonly<WindRenderProfile>;
  private documentVisible = true;
  private renderingActive = false;
  private started = false;
  private destroyed = false;
  private listenerAttached = false;
  private degradationAttempted = false;

  constructor(options: AdaptiveRenderingOptions) {
    this.initialProfile = WIND_RENDER_PROFILES[options.initialProfile];
    this.profile = this.initialProfile;
    this.monitor = createTemporalFpsMonitor({
      thresholdFps: options.lowFpsThreshold ?? DEFAULT_LOW_FPS_THRESHOLD,
      windowMs: options.lowFpsWindowMs ?? DEFAULT_LOW_FPS_WINDOW_MS,
    });
    this.now = options.now ?? defaultNow;
    this.visibilityDocument = options.document === undefined
      ? browserDocument()
      : options.document;
    this.onProfileChange = options.onProfileChange;
    this.onDocumentVisibilityChange = options.onDocumentVisibilityChange;
  }

  start(): void {
    if (this.started || this.destroyed) {
      return;
    }

    this.started = true;
    this.documentVisible = !(this.visibilityDocument?.hidden ?? false);
    this.monitor.reset();

    if (this.visibilityDocument) {
      try {
        this.visibilityDocument.addEventListener(
          'visibilitychange',
          this.handleVisibilityChange,
        );
        this.listenerAttached = true;
      } catch {
        this.listenerAttached = false;
      }
    }

    this.onDocumentVisibilityChange?.(this.documentVisible);
  }

  recordFrame(timestampMs = this.now()): void {
    if (
      !this.started
      || this.destroyed
      || !this.documentVisible
      || !this.renderingActive
      || this.degradationAttempted
    ) {
      return;
    }

    const reading = this.monitor.record(timestampMs);
    if (!reading.shouldDegrade) {
      return;
    }

    this.degradationAttempted = true;
    const degradedProfile = createDegradedWindRenderProfile(this.initialProfile);
    try {
      this.onProfileChange?.(degradedProfile);
    } finally {
      this.profile = degradedProfile;
    }
  }

  setRenderingActive(active: boolean): void {
    if (this.destroyed || this.renderingActive === active) {
      return;
    }
    this.renderingActive = active;
    this.monitor.reset();
  }

  setDocumentVisible(visible: boolean): void {
    if (this.destroyed || this.documentVisible === visible) {
      return;
    }

    this.documentVisible = visible;
    this.monitor.reset();
    this.onDocumentVisibilityChange?.(visible);
  }

  currentProfile(): Readonly<WindRenderProfile> {
    return this.profile;
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.monitor.reset();
    if (this.visibilityDocument && this.listenerAttached) {
      try {
        this.visibilityDocument.removeEventListener(
          'visibilitychange',
          this.handleVisibilityChange,
        );
      } catch {
        // A failed browser listener cleanup must not make destroy non-idempotent.
      }
    }
    this.listenerAttached = false;
  }

  private readonly handleVisibilityChange = (): void => {
    if (!this.visibilityDocument) {
      return;
    }
    this.setDocumentVisible(!this.visibilityDocument.hidden);
  };
}

export function createAdaptiveRenderingController(
  options: AdaptiveRenderingOptions,
): AdaptiveRenderingController {
  return new DefaultAdaptiveRenderingController(options);
}
