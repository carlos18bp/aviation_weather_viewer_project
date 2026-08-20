export type InitialWindRenderProfileId = 'phone' | 'tablet' | 'desktop';
export type WindRenderProfileId = InitialWindRenderProfileId | 'degraded';

export interface WindRenderProfile {
  id: WindRenderProfileId;
  particleCount: number;
  preloadRadius: 0 | 1;
}

export type MatchMediaQuery = (
  query: string,
) => Pick<MediaQueryList, 'matches'>;

export type WindRenderProfileSelector = () => Readonly<WindRenderProfile>;

export const WIND_DESKTOP_MEDIA_QUERY = '(min-width: 1200px)';
export const WIND_TABLET_MEDIA_QUERY = '(min-width: 768px)';
export const MINIMUM_DEGRADED_PARTICLE_COUNT = 450;
export const DEGRADED_PARTICLE_RATIO = 0.6;

export const WIND_RENDER_PROFILES: Readonly<
  Record<InitialWindRenderProfileId, Readonly<WindRenderProfile>>
> = Object.freeze({
  phone: Object.freeze({ id: 'phone', particleCount: 900, preloadRadius: 1 }),
  tablet: Object.freeze({ id: 'tablet', particleCount: 1_600, preloadRadius: 1 }),
  desktop: Object.freeze({ id: 'desktop', particleCount: 2_500, preloadRadius: 1 }),
});

function browserMatchMedia(): MatchMediaQuery | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  return window.matchMedia.bind(window);
}

/** Select a conservative profile without consulting user-agent strings. */
export function selectWindRenderProfile(
  matchMedia: MatchMediaQuery | null = browserMatchMedia(),
): Readonly<WindRenderProfile> {
  if (!matchMedia) {
    return WIND_RENDER_PROFILES.phone;
  }

  try {
    if (matchMedia(WIND_DESKTOP_MEDIA_QUERY).matches) {
      return WIND_RENDER_PROFILES.desktop;
    }
    if (matchMedia(WIND_TABLET_MEDIA_QUERY).matches) {
      return WIND_RENDER_PROFILES.tablet;
    }
  } catch {
    return WIND_RENDER_PROFILES.phone;
  }

  return WIND_RENDER_PROFILES.phone;
}

export function createMatchMediaWindRenderProfileSelector(
  matchMedia: MatchMediaQuery | null = browserMatchMedia(),
): WindRenderProfileSelector {
  return () => selectWindRenderProfile(matchMedia);
}

export function createDegradedWindRenderProfile(
  initialProfile: Readonly<WindRenderProfile>,
): Readonly<WindRenderProfile> {
  return Object.freeze({
    id: 'degraded',
    particleCount: Math.max(
      MINIMUM_DEGRADED_PARTICLE_COUNT,
      Math.floor(initialProfile.particleCount * DEGRADED_PARTICLE_RATIO),
    ),
    preloadRadius: 0,
  });
}

/** Bytes held by two position and two age buffers, excluding driver overhead. */
export function estimateParticleBufferPayloadBytes(particleCount: number): number {
  return particleCount * (2 * 2 * Float32Array.BYTES_PER_ELEMENT
    + 2 * Float32Array.BYTES_PER_ELEMENT);
}
