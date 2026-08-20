import {
  createDegradedWindRenderProfile,
  estimateParticleBufferPayloadBytes,
  selectWindRenderProfile,
  WIND_DESKTOP_MEDIA_QUERY,
  WIND_RENDER_PROFILES,
  WIND_TABLET_MEDIA_QUERY,
} from '../windRenderProfiles';

describe('wind render profiles', () => {
  it('exports the frozen phone, tablet, and desktop particle counts', () => {
    expect(WIND_RENDER_PROFILES).toMatchObject({
      phone: { id: 'phone', particleCount: 900, preloadRadius: 1 },
      tablet: { id: 'tablet', particleCount: 1_600, preloadRadius: 1 },
      desktop: { id: 'desktop', particleCount: 2_500, preloadRadius: 1 },
    });
  });

  it('derives one degraded profile at 60 percent with a 450 minimum', () => {
    expect(createDegradedWindRenderProfile(WIND_RENDER_PROFILES.phone)).toMatchObject({
      id: 'degraded',
      particleCount: 540,
      preloadRadius: 0,
    });
    expect(createDegradedWindRenderProfile(WIND_RENDER_PROFILES.tablet).particleCount).toBe(960);
    expect(createDegradedWindRenderProfile(WIND_RENDER_PROFILES.desktop).particleCount).toBe(1_500);
    expect(createDegradedWindRenderProfile({
      id: 'phone',
      particleCount: 600,
      preloadRadius: 1,
    }).particleCount).toBe(450);
  });

  it('selects desktop before tablet using injected matchMedia', () => {
    const matchMedia = jest.fn((query: string) => ({
      matches: query === WIND_DESKTOP_MEDIA_QUERY || query === WIND_TABLET_MEDIA_QUERY,
    }));

    expect(selectWindRenderProfile(matchMedia).id).toBe('desktop');
    expect(matchMedia).toHaveBeenCalledTimes(1);
  });

  it('selects tablet and phone at their exact media-query boundaries', () => {
    const tabletMatchMedia = (query: string) => ({ matches: query === WIND_TABLET_MEDIA_QUERY });
    const phoneMatchMedia = () => ({ matches: false });

    expect(selectWindRenderProfile(tabletMatchMedia).id).toBe('tablet');
    expect(selectWindRenderProfile(phoneMatchMedia).id).toBe('phone');
  });

  it('uses phone when matchMedia is missing or throws', () => {
    expect(selectWindRenderProfile(null).id).toBe('phone');
    expect(selectWindRenderProfile(() => {
      throw new Error('capability probe failed');
    }).id).toBe('phone');
  });

  it('reports the exact typed-array payload for both particle buffer pairs', () => {
    expect(estimateParticleBufferPayloadBytes(900)).toBe(21_600);
    expect(estimateParticleBufferPayloadBytes(1_600)).toBe(38_400);
    expect(estimateParticleBufferPayloadBytes(2_500)).toBe(60_000);
  });
});
