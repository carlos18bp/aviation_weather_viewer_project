'use client';

import type {
  AirportFeature,
  AirportWeatherResponse,
} from '@/features/airports';

import styles from './AirportPanel.module.css';


export interface AirportPanelProps {
  airport: AirportFeature | null;
  weather: AirportWeatherResponse | null;
  isLoading: boolean;
  error: string | null;
  onClose(): void;
  onRetry(): void;
}

const NUMBER_FORMAT = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 1,
});

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function timestampLabel(timestamp: string): string {
  return `${timestamp.slice(11, 13)}Z`;
}

function SimulationBadge() {
  return (
    <span className={styles.simulationBadge} aria-label="Datos simulados, no operacionales">
      Datos simulados · No operacional
    </span>
  );
}

function AirportHeader({ airport, onClose }: Pick<AirportPanelProps, 'airport' | 'onClose'>) {
  if (!airport) {
    return null;
  }

  const { properties } = airport;
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.codes}>
          <strong>{properties.icao_code}</strong>
          <span>{properties.iata_code}</span>
        </p>
        <h2 id="airport-panel-title">{properties.name}</h2>
      </div>
      <button
        type="button"
        className={styles.closeButton}
        aria-label="Cerrar panel del aeropuerto"
        onClick={onClose}
      >
        <span aria-hidden="true">×</span>
      </button>
    </header>
  );
}

function AirportMetadata({ airport }: { airport: AirportFeature }) {
  const { properties } = airport;
  return (
    <p className={styles.metadata}>
      <span>{properties.city} · {properties.department}</span>
      <span>Elevación {NUMBER_FORMAT.format(properties.elevation_ft)} ft</span>
    </p>
  );
}

function WeatherValues({ weather }: { weather: AirportWeatherResponse }) {
  const values = weather.weather;
  return (
    <div className={styles.readyState}>
      <p className={styles.timestamp}>
        Condición para{' '}
        <time dateTime={weather.timestamp}>{timestampLabel(weather.timestamp)}</time>
      </p>
      <dl className={styles.weatherGrid}>
        <div>
          <dt>Temperatura</dt>
          <dd>{formatNumber(values.temperature_c)} °C</dd>
        </div>
        <div>
          <dt>Viento</dt>
          <dd>{formatNumber(values.wind_speed_kt)} kt</dd>
        </div>
        <div>
          <dt>Dirección</dt>
          <dd>{String(values.wind_direction_deg).padStart(3, '0')}°</dd>
        </div>
        <div>
          <dt>Visibilidad</dt>
          <dd>{formatNumber(values.visibility_km)} km</dd>
        </div>
        <div>
          <dt>Presión</dt>
          <dd>{formatNumber(values.pressure_hpa)} hPa</dd>
        </div>
      </dl>
    </div>
  );
}

export function AirportPanel({
  airport,
  weather,
  isLoading,
  error,
  onClose,
  onRetry,
}: AirportPanelProps) {
  if (!airport) {
    return (
      <section
        className={`${styles.panel} ${styles.emptyState}`}
        data-state="empty"
        aria-labelledby="airport-panel-empty-title"
      >
        <SimulationBadge />
        <div>
          <p className={styles.kicker}>Condición aeroportuaria</p>
          <h2 id="airport-panel-empty-title">Selecciona un aeropuerto</h2>
          <p>Haz clic en uno de los seis puntos ICAO para consultar su condición simulada.</p>
        </div>
      </section>
    );
  }

  const state = isLoading || (!weather && error === null)
    ? 'loading'
    : error !== null
      ? 'error'
      : 'ready';

  return (
    <section className={styles.panel} data-state={state} aria-labelledby="airport-panel-title">
      <SimulationBadge />
      <AirportHeader airport={airport} onClose={onClose} />
      <AirportMetadata airport={airport} />

      {state === 'loading' && (
        <div className={styles.loadingState} role="status">
          <span className={styles.loadingPulse} aria-hidden="true" />
          Cargando condición meteorológica…
        </div>
      )}

      {state === 'error' && (
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>Reintentar</button>
        </div>
      )}

      {state === 'ready' && weather && <WeatherValues weather={weather} />}
    </section>
  );
}
