import type { DemoTimestamp } from '@/features/airports';

import {
  TEMPORAL_ENTER_DURATION_MS,
  TEMPORAL_EXIT_DURATION_MS,
} from './timelineUtils';


export interface TemporalTransition {
  phase: 'idle' | 'exiting' | 'committing' | 'entering';
  targetTimestamp: DemoTimestamp | null;
}

export interface TemporalTransitionRunOptions {
  reducedMotion?: boolean;
}

export interface TemporalTransitionRunner {
  run(
    targetTimestamp: DemoTimestamp,
    commit: () => void | Promise<void>,
    options?: TemporalTransitionRunOptions,
  ): Promise<boolean>;
  cancel(): void;
  destroy(): void;
}

export interface TemporalTransitionRunnerOptions {
  onTransition(transition: TemporalTransition): void;
  setTimeout?: typeof globalThis.setTimeout;
  clearTimeout?: typeof globalThis.clearTimeout;
}

class DefaultTemporalTransitionRunner implements TemporalTransitionRunner {
  private readonly onTransition: TemporalTransitionRunnerOptions['onTransition'];
  private readonly scheduleTimeout: typeof globalThis.setTimeout;
  private readonly cancelTimeout: typeof globalThis.clearTimeout;
  private version = 0;
  private timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private resolveWait: (() => void) | null = null;
  private destroyed = false;

  constructor(options: TemporalTransitionRunnerOptions) {
    this.onTransition = options.onTransition;
    this.scheduleTimeout = options.setTimeout ?? globalThis.setTimeout.bind(globalThis);
    this.cancelTimeout = options.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
  }

  async run(
    targetTimestamp: DemoTimestamp,
    commit: () => void | Promise<void>,
    options: TemporalTransitionRunOptions = {},
  ): Promise<boolean> {
    if (this.destroyed) {
      return false;
    }

    this.cancelCurrent(false);
    const version = ++this.version;
    this.emit('exiting', targetTimestamp);
    if (!options.reducedMotion) {
      await this.wait(TEMPORAL_EXIT_DURATION_MS);
    }
    if (!this.isCurrent(version)) {
      return false;
    }

    this.emit('committing', targetTimestamp);
    try {
      await commit();
    } catch (error) {
      if (this.isCurrent(version)) {
        this.emit('idle', null);
      }
      throw error;
    }
    if (!this.isCurrent(version)) {
      return false;
    }

    this.emit('entering', targetTimestamp);
    if (!options.reducedMotion) {
      await this.wait(TEMPORAL_ENTER_DURATION_MS);
    }
    if (!this.isCurrent(version)) {
      return false;
    }

    this.emit('idle', null);
    return true;
  }

  cancel(): void {
    if (!this.destroyed) {
      this.cancelCurrent(true);
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.cancelCurrent(false);
    this.destroyed = true;
  }

  private cancelCurrent(emitIdle: boolean): void {
    this.version += 1;
    if (this.timer !== null) {
      this.cancelTimeout(this.timer);
      this.timer = null;
    }
    this.resolveWait?.();
    this.resolveWait = null;
    if (emitIdle) {
      this.emit('idle', null);
    }
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.resolveWait = resolve;
      this.timer = this.scheduleTimeout(() => {
        this.timer = null;
        this.resolveWait = null;
        resolve();
      }, duration);
    });
  }

  private isCurrent(version: number): boolean {
    return !this.destroyed && this.version === version;
  }

  private emit(
    phase: TemporalTransition['phase'],
    targetTimestamp: DemoTimestamp | null,
  ): void {
    this.onTransition({ phase, targetTimestamp });
  }
}

export const IDLE_TEMPORAL_TRANSITION: Readonly<TemporalTransition> = {
  phase: 'idle',
  targetTimestamp: null,
};

export function createTemporalTransitionRunner(
  options: TemporalTransitionRunnerOptions,
): TemporalTransitionRunner {
  return new DefaultTemporalTransitionRunner(options);
}
