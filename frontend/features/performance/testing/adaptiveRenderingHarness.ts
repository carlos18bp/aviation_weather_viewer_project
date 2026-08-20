import { getAdaptiveFrameRetentionPlan } from '@/features/timeline/framePreloader';

import { createAdaptiveRenderingController } from '../AdaptiveRenderingController';
import {
  estimateParticleBufferPayloadBytes,
  WIND_RENDER_PROFILES,
  type InitialWindRenderProfileId,
  type WindRenderProfile,
} from '../windRenderProfiles';

export interface AdaptiveRenderingHarnessResult {
  initialProfile: Readonly<WindRenderProfile>;
  degradedProfile: Readonly<WindRenderProfile> | null;
  simulatedFps: number;
  degradationAtMs: number | null;
  initialBufferPayloadBytes: number;
  degradedBufferPayloadBytes: number | null;
  initialRetainedFrames: number;
  degradedRetainedFrames: number;
}

const FRAME_WINDOW = {
  previous: '03Z',
  active: '06Z',
  next: '09Z',
} as const;

export function runAdaptiveRenderingHarness(
  initialProfileId: InitialWindRenderProfileId,
  simulatedFps = 23.9,
): AdaptiveRenderingHarnessResult {
  const initialProfile = WIND_RENDER_PROFILES[initialProfileId];
  let timestampMs = 0;
  let degradationAtMs: number | null = null;
  const controller = createAdaptiveRenderingController({
    initialProfile: initialProfileId,
    document: null,
    onProfileChange() {
      degradationAtMs = timestampMs;
    },
  });
  controller.start();
  controller.setRenderingActive(true);
  controller.recordFrame(timestampMs);

  const intervalMs = 1_000 / simulatedFps;
  while (timestampMs < 3_200) {
    timestampMs += intervalMs;
    controller.recordFrame(timestampMs);
  }
  const finalProfile = controller.currentProfile();
  const measuredDegradedProfile = finalProfile.id === 'degraded' ? finalProfile : null;
  controller.destroy();

  const initialRetention = getAdaptiveFrameRetentionPlan(initialProfileId, FRAME_WINDOW);
  const degradedRetention = getAdaptiveFrameRetentionPlan('degraded', FRAME_WINDOW);
  return {
    initialProfile,
    degradedProfile: measuredDegradedProfile,
    simulatedFps,
    degradationAtMs,
    initialBufferPayloadBytes: estimateParticleBufferPayloadBytes(initialProfile.particleCount),
    degradedBufferPayloadBytes: measuredDegradedProfile
      ? estimateParticleBufferPayloadBytes(measuredDegradedProfile.particleCount)
      : null,
    initialRetainedFrames: initialRetention.retainedKeys.length,
    degradedRetainedFrames: degradedRetention.retainedKeys.length,
  };
}
