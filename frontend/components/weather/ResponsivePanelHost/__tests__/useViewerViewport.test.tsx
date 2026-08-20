import { act, renderHook, waitFor } from '@testing-library/react';

import {
  VIEWER_MEDIA_QUERIES,
  classifyViewerViewport,
  useViewerViewport,
} from '../useViewerViewport';


function queryMatches(query: string, width: number, height: number): boolean {
  if (query === VIEWER_MEDIA_QUERIES.phone) return width <= 767;
  if (query === VIEWER_MEDIA_QUERIES.phoneLandscape) return width <= 1199 && height <= 500;
  if (query === VIEWER_MEDIA_QUERIES.tablet) return width >= 768 && width <= 1199;
  return height >= width;
}

describe('responsive viewer viewport', () => {
  it('classifies the five frozen width boundaries', () => {
    expect(classifyViewerViewport(360, 800).viewportMode).toBe('phone');
    expect(classifyViewerViewport(767, 900).viewportMode).toBe('phone');
    expect(classifyViewerViewport(768, 1024).viewportMode).toBe('tablet');
    expect(classifyViewerViewport(1199, 800).viewportMode).toBe('tablet');
    expect(classifyViewerViewport(1200, 800).viewportMode).toBe('desktop');
  });

  it('treats a short sub-desktop landscape as phone', () => {
    expect(classifyViewerViewport(844, 390)).toEqual({
      viewportMode: 'phone',
      orientation: 'landscape',
    });
    expect(classifyViewerViewport(1024, 768)).toEqual({
      viewportMode: 'tablet',
      orientation: 'landscape',
    });
  });

  it('reacts to media changes and removes every listener', async () => {
    let size = { width: 390, height: 844 };
    const listeners = new Set<() => void>();
    window.matchMedia = jest.fn((query: string) => ({
      matches: queryMatches(query, size.width, size.height),
      media: query,
      onchange: null,
      addListener: jest.fn((listener: () => void) => listeners.add(listener)),
      removeListener: jest.fn((listener: () => void) => listeners.delete(listener)),
      addEventListener: jest.fn((_event: string, listener: () => void) => listeners.add(listener)),
      removeEventListener: jest.fn((_event: string, listener: () => void) => listeners.delete(listener)),
      dispatchEvent: jest.fn(),
    })) as typeof window.matchMedia;

    const { result, unmount } = renderHook(() => useViewerViewport());
    await waitFor(() => expect(result.current.viewportMode).toBe('phone'));

    size = { width: 1024, height: 768 };
    act(() => listeners.forEach((listener) => listener()));
    await waitFor(() => expect(result.current).toEqual({
      viewportMode: 'tablet',
      orientation: 'landscape',
    }));

    unmount();
    expect(listeners.size).toBe(0);
  });

  it('uses safe desktop mode when matchMedia is absent', async () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });

    const { result } = renderHook(() => useViewerViewport());

    await waitFor(() => expect(result.current).toEqual({
      viewportMode: 'desktop',
      orientation: 'portrait',
    }));
  });
});
