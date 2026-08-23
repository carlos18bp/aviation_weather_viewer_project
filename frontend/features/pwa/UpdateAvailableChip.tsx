'use client';

import { applyServiceWorkerUpdate } from './pwaStore';
import { usePwaState } from './usePwaInstall';

import styles from './UpdateAvailableChip.module.css';

/**
 * The worker never takes over on its own, so this is the only way an update
 * reaches an open tab before it is fully closed.
 */
export function UpdateAvailableChip() {
  const { updateAvailable } = usePwaState();

  if (!updateAvailable) {
    return null;
  }

  return (
    <p className={styles.chip} role="status" data-testid="pwa-update-chip">
      <span>Nueva versión disponible</span>
      <button type="button" onClick={() => applyServiceWorkerUpdate()}>Actualizar</button>
    </p>
  );
}
