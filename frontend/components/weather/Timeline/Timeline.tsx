'use client';

import {
  formatZuluTimestamp,
  IDLE_TEMPORAL_TRANSITION,
  type TemporalTransition,
} from '@/features/timeline';

import styles from './Timeline.module.css';


const REQUIRED_TIMESTAMP_COUNT = 6;

export interface TimelineProps {
  timestamps: string[];
  activeTimestamp: string;
  isPlaying: boolean;
  isLoading: boolean;
  onSelect(timestamp: string): void;
  onPrevious(): void;
  onNext(): void;
  onPlay(): void;
  onPause(): void;
  transition?: TemporalTransition;
}

type TimelineIconName = 'previous' | 'next' | 'play' | 'pause';

function TimelineIcon({ name }: { name: TimelineIconName }) {
  if (name === 'play') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M6.5 4.25v11.5L15 10 6.5 4.25Z" />
      </svg>
    );
  }

  if (name === 'pause') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5.5 4.5h3v11h-3v-11Zm6 0h3v11h-3v-11Z" />
      </svg>
    );
  }

  const points = name === 'previous'
    ? '12.75 4.5 7.25 10 12.75 15.5'
    : '7.25 4.5 12.75 10 7.25 15.5';

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function tryFormatTimestamp(timestamp: string): string | null {
  try {
    return formatZuluTimestamp(timestamp);
  } catch {
    return null;
  }
}

export function Timeline({
  timestamps,
  activeTimestamp,
  isPlaying,
  isLoading,
  onSelect,
  onPrevious,
  onNext,
  onPlay,
  onPause,
  transition = IDLE_TEMPORAL_TRANSITION,
}: TimelineProps) {
  const formattedTimestamps = timestamps.map(tryFormatTimestamp);
  const hasSixTimestamps = timestamps.length === REQUIRED_TIMESTAMP_COUNT;
  const hasValidTimestamps = formattedTimestamps.every((timestamp) => timestamp !== null);
  const hasActiveTimestamp = timestamps.includes(activeTimestamp);
  const activeLabel = tryFormatTimestamp(activeTimestamp);
  const canSelect = hasSixTimestamps && hasValidTimestamps && !isLoading;
  const canNavigate = canSelect && hasActiveTimestamp;
  const canStartPlayback = canNavigate;

  let propsError: string | null = null;
  if (!hasSixTimestamps) {
    propsError = 'El timeline requiere exactamente seis timestamps.';
  } else if (!hasValidTimestamps || activeLabel === null) {
    propsError = 'El timeline contiene un timestamp ISO inválido.';
  } else if (!hasActiveTimestamp) {
    propsError = 'El timestamp activo no está disponible en el timeline.';
  }

  return (
    <section
      className={styles.timeline}
      aria-label="Línea de tiempo meteorológica"
      aria-busy={isLoading}
      data-loading={isLoading ? 'true' : 'false'}
      data-transition-phase={transition.phase}
      data-transition-target={transition.targetTimestamp ?? undefined}
    >
      <div className={styles.summary}>
        <div className={styles.activeTime} aria-label="Hora meteorológica seleccionada">
          <span>UTC / ZULU</span>
          <strong>{activeLabel ?? '—'}</strong>
        </div>

        <div className={styles.transport} aria-label="Controles de reproducción">
          <button
            type="button"
            className={styles.iconButton}
            onClick={onPrevious}
            disabled={!canNavigate}
            aria-label="Timestamp anterior"
            title="Anterior"
          >
            <TimelineIcon name="previous" />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.playButton}`}
            onClick={isPlaying ? onPause : onPlay}
            disabled={!isPlaying && !canStartPlayback}
            aria-label={isPlaying ? 'Pausar reproducción' : 'Iniciar reproducción'}
            aria-pressed={isPlaying}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            <TimelineIcon name={isPlaying ? 'pause' : 'play'} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onNext}
            disabled={!canNavigate}
            aria-label="Timestamp siguiente"
            title="Siguiente"
          >
            <TimelineIcon name="next" />
          </button>
        </div>

        {isLoading && (
          <span className={styles.loadingState} role="status">
            <i aria-hidden="true" />
            Actualizando datos…
          </span>
        )}
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <i
          key={activeTimestamp}
          className={styles.progressFill}
          data-testid="timeline-playback-progress"
          data-playing={isPlaying ? 'true' : 'false'}
        />
      </div>

      <div className={styles.timestamps} aria-label="Timestamps disponibles">
        {timestamps.map((timestamp, index) => {
          const label = formattedTimestamps[index] ?? 'Hora inválida';
          const isActive = timestamp === activeTimestamp;

          return (
            <button
              key={`${timestamp}-${index}`}
              type="button"
              className={styles.timestampButton}
              onClick={() => onSelect(timestamp)}
              disabled={!canSelect}
              aria-label={`Seleccionar ${label}`}
              aria-current={isActive ? 'time' : undefined}
              aria-pressed={isActive}
              data-active={isActive ? 'true' : 'false'}
            >
              <i aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {propsError && (
        <p className={styles.propsError} role="alert">
          {propsError}
        </p>
      )}
    </section>
  );
}
