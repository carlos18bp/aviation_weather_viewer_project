import styles from './ViewerStatus.module.css';


export type ViewerStatusKind = 'idle' | 'loading' | 'error' | 'fallback';

export interface ViewerStatusProps {
  status: ViewerStatusKind;
  message?: string;
}

const STATUS_COPY: Readonly<Record<Exclude<ViewerStatusKind, 'idle'>, {
  label: string;
  message: string;
}>> = {
  loading: {
    label: 'Actualizando visualización',
    message: 'Cargando datos meteorológicos simulados…',
  },
  error: {
    label: 'No se pudo actualizar',
    message: 'La visualización anterior permanece disponible.',
  },
  fallback: {
    label: 'Modo alternativo',
    message: 'El viento se muestra con una representación estática.',
  },
};

export function ViewerStatus({ status, message }: ViewerStatusProps) {
  if (status === 'idle') {
    return null;
  }

  const copy = STATUS_COPY[status];

  return (
    <section
      className={styles.status}
      data-status={status}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
    >
      <i className={styles.indicator} aria-hidden="true" />
      <span>
        <strong>{copy.label}</strong>
        <small>{message ?? copy.message}</small>
      </span>
    </section>
  );
}
