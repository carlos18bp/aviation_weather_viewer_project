'use client';

import { useEffect, useState } from 'react';


export type ViewerViewportMode = 'phone' | 'tablet' | 'desktop';
export type ViewerOrientation = 'portrait' | 'landscape';

export interface ViewerViewportClassification {
  viewportMode: ViewerViewportMode;
  orientation: ViewerOrientation;
}

export const VIEWER_MEDIA_QUERIES = {
  phone: '(max-width: 767px)',
  phoneLandscape: '(max-width: 1199px) and (max-height: 500px)',
  tablet: '(min-width: 768px) and (max-width: 1199px)',
  portrait: '(orientation: portrait)',
} as const;

const SAFE_VIEWPORT: ViewerViewportClassification = {
  viewportMode: 'desktop',
  orientation: 'landscape',
};

export function classifyViewerViewport(
  width: number,
  height: number,
): ViewerViewportClassification {
  const orientation = height >= width ? 'portrait' : 'landscape';
  const phoneLandscape = width < 1200 && height <= 500;
  const viewportMode = width <= 767 || phoneLandscape
    ? 'phone'
    : width <= 1199
      ? 'tablet'
      : 'desktop';

  return { viewportMode, orientation };
}

function readViewport(): ViewerViewportClassification {
  if (typeof window === 'undefined') {
    return SAFE_VIEWPORT;
  }

  if (typeof window.matchMedia !== 'function') {
    return {
      viewportMode: 'desktop',
      orientation: window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape',
    };
  }

  const phone = window.matchMedia(VIEWER_MEDIA_QUERIES.phone).matches
    || window.matchMedia(VIEWER_MEDIA_QUERIES.phoneLandscape).matches;
  const tablet = window.matchMedia(VIEWER_MEDIA_QUERIES.tablet).matches;

  return {
    viewportMode: phone ? 'phone' : tablet ? 'tablet' : 'desktop',
    orientation: window.matchMedia(VIEWER_MEDIA_QUERIES.portrait).matches
      ? 'portrait'
      : 'landscape',
  };
}

function isSameViewport(
  current: ViewerViewportClassification,
  next: ViewerViewportClassification,
): boolean {
  return current.viewportMode === next.viewportMode
    && current.orientation === next.orientation;
}

export function useViewerViewport(): ViewerViewportClassification {
  const [viewport, setViewport] = useState<ViewerViewportClassification>(SAFE_VIEWPORT);

  useEffect(() => {
    const updateViewport = () => {
      const next = readViewport();
      setViewport((current) => (isSameViewport(current, next) ? current : next));
    };

    updateViewport();

    if (typeof window.matchMedia !== 'function') {
      window.addEventListener('resize', updateViewport);
      window.addEventListener('orientationchange', updateViewport);
      return () => {
        window.removeEventListener('resize', updateViewport);
        window.removeEventListener('orientationchange', updateViewport);
      };
    }

    const mediaQueries = Object.values(VIEWER_MEDIA_QUERIES).map((query) => (
      window.matchMedia(query)
    ));

    for (const mediaQuery of mediaQueries) {
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', updateViewport);
      } else {
        mediaQuery.addListener(updateViewport);
      }
    }
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      for (const mediaQuery of mediaQueries) {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', updateViewport);
        } else {
          mediaQuery.removeListener(updateViewport);
        }
      }
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  return viewport;
}
