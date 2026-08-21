import { act, renderHook, waitFor } from '@testing-library/react';

import {
  COARSE_TABLET_QUERY,
  resolveIntegratedViewportMode,
  useIntegratedViewerViewport,
} from '../responsiveIntegration';


describe('Phase 23 responsive integration', () => {
  it.each([
    ['desktop', true, 'tablet'],
    ['desktop', false, 'desktop'],
    ['tablet', true, 'tablet'],
    ['phone', true, 'phone'],
  ] as const)(
    'maps classified %s with coarseTablet=%s to %s',
    (classified, coarseTablet, expected) => {
      expect(resolveIntegratedViewportMode(classified, coarseTablet)).toBe(expected);
    },
  );

  it('freezes the coarse tablet matrix boundary without catching phone landscape', () => {
    expect(COARSE_TABLET_QUERY).toBe(
      '(pointer: coarse) and (min-width: 768px) and (max-width: 1366px) and (min-height: 501px)',
    );
  });

  it('uses physical dimensions when WebKit keeps an orientation media query stale', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    const classified = { viewportMode: 'phone', orientation: 'portrait' } as const;
    const { result } = renderHook(() => useIntegratedViewerViewport(classified, false));

    await waitFor(() => expect(result.current.orientation).toBe('portrait'));
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 844 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 390 });
    act(() => window.dispatchEvent(new Event('resize')));

    await waitFor(() => expect(result.current).toEqual({
      viewportMode: 'phone',
      orientation: 'landscape',
    }));
  });
});
