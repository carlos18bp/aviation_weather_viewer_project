'use client';

import { useEffect } from 'react';

import { setServiceWorkerHandle, setUpdateAvailable } from './pwaStore';
import { registerServiceWorker, type ServiceWorkerHandle } from './registerServiceWorker';

/** Mount-only: registers the worker and wires the update signal into the store. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    let handle: ServiceWorkerHandle | null = null;
    let cancelled = false;

    void registerServiceWorker(() => setUpdateAvailable(true)).then((result) => {
      if (cancelled) {
        result?.dispose();
        return;
      }

      handle = result;
      setServiceWorkerHandle(result);
    });

    return () => {
      cancelled = true;
      setServiceWorkerHandle(null);
      handle?.dispose();
    };
  }, []);

  return null;
}
