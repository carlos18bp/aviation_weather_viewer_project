export interface ServiceWorkerHandle {
  /** Tells the waiting worker to take over, which triggers exactly one reload. */
  applyUpdate(): void;
  dispose(): void;
}

export function isServiceWorkerSupported(): boolean {
  return (
    typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && typeof caches !== 'undefined'
  );
}

/** Off under `next dev` by default: a caching worker and HMR do not mix. */
export function isServiceWorkerEnabled(): boolean {
  if (!isServiceWorkerSupported()) return false;
  return (
    process.env.NODE_ENV === 'production'
    || process.env.NEXT_PUBLIC_PWA_ENABLED === '1'
  );
}

export async function registerServiceWorker(
  onUpdateAvailable: () => void,
): Promise<ServiceWorkerHandle | null> {
  if (!isServiceWorkerEnabled()) {
    return null;
  }

  let registration: ServiceWorkerRegistration;

  try {
    registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      // Redundant while Next serves public/ with max-age=0, but it keeps the
      // update path correct regardless of how the origin is configured later.
      updateViaCache: 'none',
    });
  } catch {
    // A viewer that works without a service worker must keep working when the
    // registration fails (MRNF-007).
    return null;
  }

  const cleanups: Array<() => void> = [];
  // controllerchange also fires on the very first activation because of
  // clients.claim(); reloading there would bounce every first-time visitor.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  const handleUpdateFound = () => {
    const installing = registration.installing;
    if (!installing) return;

    const handleStateChange = () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        onUpdateAvailable();
      }
    };

    installing.addEventListener('statechange', handleStateChange);
    cleanups.push(() => installing.removeEventListener('statechange', handleStateChange));
  };

  const handleControllerChange = () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  };

  // Covers a tab opened after the update had already installed.
  if (registration.waiting && navigator.serviceWorker.controller) {
    onUpdateAvailable();
  }

  registration.addEventListener('updatefound', handleUpdateFound);
  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  cleanups.push(() => registration.removeEventListener('updatefound', handleUpdateFound));
  cleanups.push(() =>
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange),
  );

  return {
    applyUpdate() {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    },
    dispose() {
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
