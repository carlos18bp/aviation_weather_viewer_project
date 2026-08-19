'use client';

import styles from './ViewerActions.module.css';


export interface ViewerActionsProps {
  onReset(): void;
  onRetry?(): void;
  isLoading?: boolean;
}

function ActionIcon({ name }: { name: 'reset' | 'retry' }) {
  const path = name === 'reset'
    ? 'M5.2 6.4A6 6 0 1 1 4 11M4.2 4v4h4'
    : 'M15.5 9A5.5 5.5 0 0 0 5 7M4.5 11A5.5 5.5 0 0 0 15 13M5 3.8V7h3.2M15 16.2V13h-3.2';

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function ViewerActions({
  onReset,
  onRetry,
  isLoading = false,
}: ViewerActionsProps) {
  return (
    <section
      className={styles.actions}
      role="group"
      aria-label="Acciones del visor"
      aria-busy={isLoading}
    >
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={isLoading}>
          <ActionIcon name="retry" />
          Reintentar
        </button>
      )}
      <button type="button" onClick={onReset}>
        <ActionIcon name="reset" />
        Reiniciar
      </button>
    </section>
  );
}
