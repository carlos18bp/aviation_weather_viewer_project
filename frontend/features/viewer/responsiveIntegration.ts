import { useEffect, useState } from 'react';

import {
  classifyViewerViewport,
  type ViewerViewportClassification,
  type ViewerViewportMode,
} from '@/components/weather/ResponsivePanelHost';


export const COARSE_TABLET_QUERY = (
  '(pointer: coarse) and (min-width: 768px) and (max-width: 1366px) and (min-height: 501px)'
);

export function resolveIntegratedViewportMode(
  classifiedMode: ViewerViewportMode,
  coarseTablet: boolean,
): ViewerViewportMode {
  return classifiedMode === 'desktop' && coarseTablet
    ? 'tablet'
    : classifiedMode;
}

function readPhysicalViewport(): ViewerViewportClassification | null {
  if (typeof window === 'undefined') return null;
  return classifyViewerViewport(window.innerWidth, window.innerHeight);
}

export function useIntegratedViewerViewport(
  classified: ViewerViewportClassification,
  coarseTablet: boolean,
): ViewerViewportClassification {
  const [physical, setPhysical] = useState<ViewerViewportClassification | null>(null);

  useEffect(() => {
    const update = () => setPhysical(readPhysicalViewport());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const current = physical ?? classified;
  return {
    viewportMode: resolveIntegratedViewportMode(current.viewportMode, coarseTablet),
    orientation: current.orientation,
  };
}
