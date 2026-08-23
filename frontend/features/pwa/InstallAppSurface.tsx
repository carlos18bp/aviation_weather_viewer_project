'use client';

import { useEffect } from 'react';

import { InstallAppFab } from './InstallAppFab';
import { UpdateAvailableChip } from './UpdateAvailableChip';
import { AUTO_OPEN_DELAY_MS, autoOpenModalOnce } from './pwaStore';

import styles from './InstallAppSurface.module.css';

export interface InstallAppSurfaceProps {
  /**
   * Lets the explanatory modal open by itself once. The caller gates this on the
   * map being ready so the modal never lands on top of a loading screen.
   */
  autoOpenEnabled?: boolean;
  /** Hidden while a responsive panel covers this corner, or in presentation mode. */
  hidden?: boolean;
}

/** Bottom-right corner of the viewer stage: install button plus update chip. */
export function InstallAppSurface({
  autoOpenEnabled = false,
  hidden = false,
}: InstallAppSurfaceProps) {
  useEffect(() => {
    if (!autoOpenEnabled) {
      return undefined;
    }

    const timer = setTimeout(() => {
      autoOpenModalOnce();
    }, AUTO_OPEN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [autoOpenEnabled]);

  if (hidden) {
    return null;
  }

  return (
    <div className={styles.surface} data-testid="pwa-install-surface">
      <UpdateAvailableChip />
      <InstallAppFab />
    </div>
  );
}
