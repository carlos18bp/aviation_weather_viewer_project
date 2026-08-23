'use client';

import { InstallIcon } from './InstallIcon';
import { openModal } from './pwaStore';
import { usePwaState } from './usePwaInstall';

import styles from './InstallAppFab.module.css';

export interface InstallAppFabProps {
  /** Hidden while a panel covers this corner, or in presentation mode. */
  hidden?: boolean;
}

/**
 * The prominent entry point. It stays visible even where installing is
 * impossible (desktop Firefox, iOS Chrome): the modal explains what to do
 * instead, which beats an affordance that silently disappears.
 */
export function InstallAppFab({ hidden = false }: InstallAppFabProps) {
  const { isInstalled } = usePwaState();

  if (isInstalled || hidden) {
    return null;
  }

  return (
    <button
      type="button"
      className={styles.fab}
      data-testid="pwa-install-fab"
      aria-label="Instalar la aplicación en tu dispositivo"
      onClick={() => openModal()}
    >
      <InstallIcon />
      <span>Instalar app</span>
    </button>
  );
}
