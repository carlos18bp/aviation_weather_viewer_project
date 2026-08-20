import { createTemporalFpsMonitor } from '../TemporalFpsMonitor';

function recordFps(
  fps: number,
  durationMs: number,
): ReturnType<ReturnType<typeof createTemporalFpsMonitor>['record']> {
  const monitor = createTemporalFpsMonitor();
  const intervalMs = 1_000 / fps;
  let reading = monitor.record(0);
  for (let timestampMs = intervalMs; timestampMs <= durationMs; timestampMs += intervalMs) {
    reading = monitor.record(timestampMs);
  }
  return reading;
}

describe('TemporalFpsMonitor', () => {
  it('degrades at 23.9 FPS after a complete three-second window', () => {
    const reading = recordFps(23.9, 3_100);

    expect(reading.coveredDurationMs).toBeCloseTo(3_000, 6);
    expect(reading.averageFps).toBeCloseTo(23.9, 6);
    expect(reading.shouldDegrade).toBe(true);
  });

  it('does not degrade at the exact 24 FPS boundary', () => {
    const reading = recordFps(24, 3_100);

    expect(reading.averageFps).toBeCloseTo(24, 6);
    expect(reading.shouldDegrade).toBe(false);
  });

  it('ignores a gap over 250 ms and requires a new complete window', () => {
    const monitor = createTemporalFpsMonitor();
    const intervalMs = 1_000 / 23.9;
    let timestampMs = 0;
    monitor.record(timestampMs);
    let reading = monitor.record(timestampMs);
    while (timestampMs < 2_900) {
      timestampMs += intervalMs;
      reading = monitor.record(timestampMs);
    }
    expect(reading.shouldDegrade).toBe(false);

    timestampMs += 251;
    expect(monitor.record(timestampMs).coveredDurationMs).toBe(0);
    while (timestampMs < 5_950) {
      timestampMs += intervalMs;
      reading = monitor.record(timestampMs);
    }
    expect(reading.shouldDegrade).toBe(false);
    while (timestampMs < 6_300) {
      timestampMs += intervalMs;
      reading = monitor.record(timestampMs);
    }
    expect(reading.shouldDegrade).toBe(true);
  });

  it('discards non-monotonic and non-finite timestamps', () => {
    const monitor = createTemporalFpsMonitor();
    monitor.record(100);
    monitor.record(142);

    expect(monitor.record(141)).toMatchObject({ averageFps: null, shouldDegrade: false });
    expect(monitor.record(Number.NaN)).toMatchObject({ averageFps: null, shouldDegrade: false });
    expect(monitor.record(184).averageFps).toBeCloseTo(1_000 / 42, 6);
  });

  it('reset removes the prior low-FPS history', () => {
    const monitor = createTemporalFpsMonitor();
    for (let timestampMs = 0; timestampMs < 2_900; timestampMs += 42) {
      monitor.record(timestampMs);
    }

    monitor.reset();
    expect(monitor.record(10_000)).toMatchObject({
      averageFps: null,
      coveredDurationMs: 0,
      shouldDegrade: false,
    });
  });
});
