'use client';

import { InstallIcon } from './InstallIcon';
import { openModal } from './pwaStore';
import { usePwaState } from './usePwaInstall';

import styles from './InstallAppButton.module.css';

/**
 * The toolbar/menu entry point. Rendered in the desktop header cluster and in
 * the "Más acciones" panel on phone and tablet, with the same label and order
 * in both (NAV-1).
 */
export function InstallAppButton() {
  const { isInstalled } = usePwaState();

  if (isInstalled) {
    return null;
  }

  return (
    <section className={styles.install} aria-label="Instalar aplicación">
      <button type="button" data-testid="pwa-install-button" onClick={() => openModal()}>
        <InstallIcon />
        Instalar app
      </button>
    </section>
  );
}
