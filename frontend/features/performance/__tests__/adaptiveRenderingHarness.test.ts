import { runAdaptiveRenderingHarness } from '../testing/adaptiveRenderingHarness';

describe('adaptive rendering measurement harness', () => {
  it.each([
    ['phone', 900, 540, 21_600, 12_960, 2],
    ['tablet', 1_600, 960, 38_400, 23_040, 3],
    ['desktop', 2_500, 1_500, 60_000, 36_000, 3],
  ] as const)(
    '%s: %i -> %i particles, %i -> %i buffer bytes, retain %i -> 1',
    (profileId, initialCount, degradedCount, initialBytes, degradedBytes, retainedFrames) => {
      const result = runAdaptiveRenderingHarness(profileId);

      expect(result).toMatchObject({
        simulatedFps: 23.9,
        initialBufferPayloadBytes: initialBytes,
        degradedBufferPayloadBytes: degradedBytes,
        initialRetainedFrames: retainedFrames,
        degradedRetainedFrames: 1,
      });
      expect(result.initialProfile.particleCount).toBe(initialCount);
      expect(result.degradedProfile?.particleCount).toBe(degradedCount);
      expect(result.degradationAtMs).toBeGreaterThanOrEqual(3_000);
      expect(result.degradationAtMs).toBeLessThan(3_050);
    },
  );

  it('24 FPS remains on the exact desktop profile', () => {
    const result = runAdaptiveRenderingHarness('desktop', 24);

    expect(result.degradedProfile).toBeNull();
    expect(result.degradationAtMs).toBeNull();
    expect(result.initialProfile.particleCount).toBe(2_500);
  });
});
