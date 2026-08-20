'use client';

import type { WeatherSampleResult } from '@/features/weather/picker';

import styles from './WeatherPicker.module.css';

export interface WeatherPickerProps {
  result: WeatherSampleResult | null;
  loading: boolean;
  onClose(): void;
  onRetry(): void;
}

const VALUE_FORMAT = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const COORDINATE_FORMAT = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function Coordinates({ coordinate }: { coordinate: readonly [number, number] }) {
  return (
    <p className={styles.coordinates}>
      <span>Lat {COORDINATE_FORMAT.format(coordinate[1])}°</span>
      <span>Lon {COORDINATE_FORMAT.format(coordinate[0])}°</span>
    </p>
  );
}

function ReadyValues({ result }: { result: Extract<WeatherSampleResult, { status: 'ready' }> }) {
  const { sample } = result;
  return (
    <>
      <Coordinates coordinate={sample.coordinate} />
      <p className={styles.timestamp}>
        Condición para <time dateTime={sample.timestamp}>{sample.timestamp.slice(11, 13)}Z</time>
      </p>
      <dl className={styles.values}>
        <div>
          <dt>Temperatura</dt>
          <dd>{VALUE_FORMAT.format(sample.temperatureC)} °C</dd>
        </div>
        <div>
          <dt>Viento</dt>
          <dd>{VALUE_FORMAT.format(sample.windSpeedKt)} kt</dd>
        </div>
        <div>
          <dt>Dirección</dt>
          <dd>{String(sample.windDirectionDeg).padStart(3, '0')}°</dd>
        </div>
      </dl>
    </>
  );
}

export function WeatherPicker({
  result,
  loading,
  onClose,
  onRetry,
}: WeatherPickerProps) {
  if (!result && !loading) {
    return null;
  }

  const state = loading ? 'loading' : result?.status ?? 'unavailable';
  return (
    <section
      className={styles.panel}
      data-state={state}
      aria-labelledby="weather-picker-title"
    >
      <header className={styles.header}>
        <div>
          <p className={styles.badge}>Datos simulados · No operacional</p>
          <h2 id="weather-picker-title">Punto meteorológico</h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Cerrar picker meteorológico"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {loading && (
        <p className={styles.status} role="status">Cargando datos del punto…</p>
      )}
      {!loading && result?.status === 'ready' && <ReadyValues result={result} />}
      {!loading && result?.status === 'outside-coverage' && (
        <div className={styles.status} role="status">
          <Coordinates coordinate={result.coordinate} />
          <strong>Fuera de cobertura</strong>
        </div>
      )}
      {!loading && result?.status === 'unavailable' && (
        <div className={styles.error} role="alert">
          <Coordinates coordinate={result.coordinate} />
          <strong>Datos no disponibles</strong>
          <p>{result.message}</p>
          <button type="button" onClick={onRetry}>Reintentar</button>
        </div>
      )}
    </section>
  );
}
