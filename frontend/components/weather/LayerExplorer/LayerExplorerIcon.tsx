import type { ReactNode } from 'react';

import type {
  LayerExplorerLayerId,
  LayerExplorerOverlayId,
} from '@/features/weather/layer-explorer';


export type LayerExplorerIconId = LayerExplorerLayerId | LayerExplorerOverlayId;

function iconPaths(id: LayerExplorerIconId): ReactNode {
  switch (id) {
    case 'wind':
      return (
        <>
          <path d="M3 7h10.2a2.8 2.8 0 1 0-2.5-4" />
          <path d="M3 11h14a2.8 2.8 0 1 1-2.5 4" />
          <path d="M3 15h6" />
        </>
      );
    case 'temperature':
      return (
        <>
          <path d="M9 4a3 3 0 0 1 6 0v9.2a4.5 4.5 0 1 1-6 0V4Z" />
          <path d="M12 7v8" />
          <circle cx="12" cy="17" r="1.5" />
        </>
      );
    case 'precipitation':
      return (
        <>
          <path d="M12 2.8c3.1 3.9 5 6.6 5 9.3a5 5 0 1 1-10 0c0-2.7 1.9-5.4 5-9.3Z" />
          <path d="M9.3 13.2c.5 1.2 1.4 1.8 2.7 1.8" />
        </>
      );
    case 'cloud-cover':
      return (
        <>
          <path d="M6.2 17.5h11a3.8 3.8 0 0 0 .5-7.6A6.3 6.3 0 0 0 6 8.1a4.7 4.7 0 0 0 .2 9.4Z" />
          <path d="M8.5 12.5h7" />
        </>
      );
    case 'cloud-base':
      return (
        <>
          <path d="M5.8 13.7h11.4a3.4 3.4 0 0 0 .4-6.8A6 6 0 0 0 6.5 5.4a4.2 4.2 0 0 0-.7 8.3Z" />
          <path d="M6 18.5h12" />
          <path d="m8 16.5-2 2 2 2M16 16.5l2 2-2 2" />
        </>
      );
    case 'visibility':
      return (
        <>
          <path d="M2.7 12s3.5-5 9.3-5 9.3 5 9.3 5-3.5 5-9.3 5-9.3-5-9.3-5Z" />
          <circle cx="12" cy="12" r="2.4" />
          <path d="M4.5 19h15" />
        </>
      );
    case 'wind-gusts':
      return (
        <>
          <path d="M2.5 7h12a2.5 2.5 0 1 0-2.2-3.7" />
          <path d="M2.5 11h17" />
          <path d="M2.5 15h10a2.5 2.5 0 1 1-2.2 3.7" />
          <path d="m18 8 3 3-3 3" />
        </>
      );
    case 'pressure-isobars':
      return (
        <>
          <path d="M4 15.5c2.2 2.7 7.8 3.8 12.5 1.6 4.1-1.9 5.3-5.8 2.7-8.3C16.5 6.2 11 6 7.3 8.3 4 10.3 3 13 4 15.5Z" />
          <path d="M7.2 14.2c1.5 1.4 5 1.8 7.5.5 2.1-1.1 2.6-3 .9-4.1-1.8-1.1-5-1-7 .3-1.7 1-2.2 2.3-1.4 3.3Z" />
          <path d="M10.4 13.1c.5.4 1.6.5 2.4.1" />
        </>
      );
  }
}

export function LayerExplorerIcon({ id }: { id: LayerExplorerIconId }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {iconPaths(id)}
    </svg>
  );
}
