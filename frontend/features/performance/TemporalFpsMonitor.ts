export interface TemporalFpsMonitorOptions {
  thresholdFps?: number;
  windowMs?: number;
  maximumGapMs?: number;
}

export interface TemporalFpsReading {
  averageFps: number | null;
  coveredDurationMs: number;
  shouldDegrade: boolean;
}

interface FrameInterval {
  startMs: number;
  endMs: number;
}

export interface TemporalFpsMonitor {
  record(timestampMs: number): TemporalFpsReading;
  reset(): void;
}

export const DEFAULT_LOW_FPS_THRESHOLD = 24;
export const DEFAULT_LOW_FPS_WINDOW_MS = 3_000;
export const MAXIMUM_MEASURED_FRAME_GAP_MS = 250;

const FPS_COMPARISON_EPSILON = 1e-9;

const EMPTY_READING: TemporalFpsReading = Object.freeze({
  averageFps: null,
  coveredDurationMs: 0,
  shouldDegrade: false,
});

class SlidingTemporalFpsMonitor implements TemporalFpsMonitor {
  private readonly thresholdFps: number;
  private readonly windowMs: number;
  private readonly maximumGapMs: number;
  private intervals: FrameInterval[] = [];
  private lastTimestampMs: number | null = null;

  constructor(options: TemporalFpsMonitorOptions = {}) {
    this.thresholdFps = options.thresholdFps ?? DEFAULT_LOW_FPS_THRESHOLD;
    this.windowMs = options.windowMs ?? DEFAULT_LOW_FPS_WINDOW_MS;
    this.maximumGapMs = options.maximumGapMs ?? MAXIMUM_MEASURED_FRAME_GAP_MS;
  }

  record(timestampMs: number): TemporalFpsReading {
    if (!Number.isFinite(timestampMs)) {
      return EMPTY_READING;
    }

    if (this.lastTimestampMs === null) {
      this.lastTimestampMs = timestampMs;
      return EMPTY_READING;
    }

    if (timestampMs <= this.lastTimestampMs) {
      return EMPTY_READING;
    }

    const intervalMs = timestampMs - this.lastTimestampMs;
    const startMs = this.lastTimestampMs;
    this.lastTimestampMs = timestampMs;

    if (intervalMs > this.maximumGapMs) {
      this.intervals = [];
      return EMPTY_READING;
    }

    this.intervals.push({ startMs, endMs: timestampMs });
    const windowStartMs = timestampMs - this.windowMs;
    this.intervals = this.intervals.filter(({ endMs }) => endMs > windowStartMs);

    let coveredDurationMs = 0;
    let representedFrames = 0;
    for (const interval of this.intervals) {
      const fullDurationMs = interval.endMs - interval.startMs;
      const overlapMs = interval.endMs - Math.max(interval.startMs, windowStartMs);
      if (overlapMs <= 0 || fullDurationMs <= 0) {
        continue;
      }
      coveredDurationMs += overlapMs;
      representedFrames += overlapMs / fullDurationMs;
    }

    if (coveredDurationMs <= 0) {
      return EMPTY_READING;
    }

    const averageFps = representedFrames * 1_000 / coveredDurationMs;
    const hasFullWindow = coveredDurationMs >= this.windowMs - FPS_COMPARISON_EPSILON;
    return {
      averageFps,
      coveredDurationMs,
      shouldDegrade: hasFullWindow
        && averageFps < this.thresholdFps - FPS_COMPARISON_EPSILON,
    };
  }

  reset(): void {
    this.intervals = [];
    this.lastTimestampMs = null;
  }
}

export function createTemporalFpsMonitor(
  options: TemporalFpsMonitorOptions = {},
): TemporalFpsMonitor {
  return new SlidingTemporalFpsMonitor(options);
}
