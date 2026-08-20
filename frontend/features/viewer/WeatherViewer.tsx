'use client';

import { useCallback, useRef, useState } from 'react';

import { AirportPanel } from '@/components/weather/AirportPanel';
import { LayerSelector } from '@/components/weather/LayerSelector';
import { Timeline } from '@/components/weather/Timeline';
import { ViewerActions } from '@/components/weather/ViewerActions';
import {
  ViewerStatus,
  type ViewerStatusKind,
} from '@/components/weather/ViewerStatus';
import { WeatherLegend } from '@/components/weather/WeatherLegend';
import {
  WeatherViewerShell,
  type WeatherMapControllerFactory,
} from '@/components/weather/WeatherViewerShell';
import {
  DEMO_TIMESTAMPS,
  type AirportFeature,
} from '@/features/airports';
import { TEMPERATURE_LEGEND } from '@/features/weather/temperature';
import { WIND_LEGEND } from '@/features/weather/wind';

import styles from './WeatherViewer.module.css';
import {
  INITIAL_VIEWER_SNAPSHOT,
  ViewerOrchestrator,
  type ViewerSnapshot,
} from './ViewerOrchestrator';


function zuluHour(timestamp: string): string {
  return `${timestamp.slice(11, 13)}Z`;
}

function statusFor(snapshot: ViewerSnapshot): {
  kind: ViewerStatusKind;
  message?: string;
} {
  const error = snapshot.catalogError ?? snapshot.frameError ?? snapshot.airportError;
  if (error) {
    return { kind: 'error', message: error };
  }
  if (snapshot.catalogStatus !== 'ready' || snapshot.isFrameLoading) {
    return { kind: 'loading' };
  }
  if (snapshot.activeLayer === 'wind' && snapshot.fallbackMessage) {
    return { kind: 'fallback', message: snapshot.fallbackMessage };
  }
  return { kind: 'idle' };
}

function AirportAvailability({
  snapshot,
  onRetry,
}: {
  snapshot: ViewerSnapshot;
  onRetry(): void;
}) {
  if (snapshot.airportsStatus === 'error') {
    return (
      <section className={styles.airportAvailability} data-status="error" role="alert">
        <p className={styles.kicker}>Aeropuertos</p>
        <h2>Puntos ICAO no disponibles</h2>
        <p>{snapshot.airportsError}</p>
        <button type="button" onClick={onRetry}>Reintentar aeropuertos</button>
      </section>
    );
  }

  return (
    <section className={styles.airportAvailability} data-status="loading" role="status">
      <span className={styles.loadingDot} aria-hidden="true" />
      Cargando aeropuertos sin bloquear la meteorología…
    </section>
  );
}

export function WeatherViewer() {
  const [snapshot, setSnapshot] = useState<ViewerSnapshot>({
    ...INITIAL_VIEWER_SNAPSHOT,
  });
  const orchestratorRef = useRef<ViewerOrchestrator | null>(null);

  const controllerFactory = useCallback<WeatherMapControllerFactory>((options) => {
    const orchestrator = new ViewerOrchestrator({
      ...options,
      onSnapshot: setSnapshot,
    });
    orchestratorRef.current = orchestrator;
    return orchestrator;
  }, []);

  const orchestrator = () => orchestratorRef.current;
  const selectedAirport = (snapshot.airports?.features as AirportFeature[] | undefined)?.find(
    (airport) => airport.properties.icao_code === snapshot.selectedAirport,
  ) ?? null;
  const legend = snapshot.activeLayer === 'temperature'
    ? TEMPERATURE_LEGEND
    : WIND_LEGEND;
  const viewerStatus = statusFor(snapshot);
  const catalogReady = snapshot.catalogStatus === 'ready';
  const controlsDisabled = !catalogReady || snapshot.isFrameLoading;
  const timelineTimestamps = catalogReady
    ? [...snapshot.availableTimestamps]
    : [...DEMO_TIMESTAMPS];
  const hasPrimaryError = Boolean(
    snapshot.catalogError || snapshot.frameError || snapshot.airportError,
  );

  const airportPanel = snapshot.airportsStatus === 'ready' ? (
    <AirportPanel
      airport={selectedAirport}
      weather={snapshot.airportWeather}
      isLoading={Boolean(
        snapshot.selectedAirport
        && snapshot.isFrameLoading
        && snapshot.airportWeather === null,
      )}
      error={snapshot.airportError}
      onClose={() => orchestrator()?.closeAirport()}
      onRetry={() => orchestrator()?.retry()}
    />
  ) : (
    <AirportAvailability
      snapshot={snapshot}
      onRetry={() => orchestrator()?.retryAirports()}
    />
  );

  const layerPanel = (
    <div className={styles.layerPanel}>
      <LayerSelector
        activeLayer={snapshot.activeLayer}
        disabled={controlsDisabled}
        onSelect={(layer) => orchestrator()?.selectLayer(layer)}
      />
      <WeatherLegend {...legend} />
      <ViewerStatus status={viewerStatus.kind} message={viewerStatus.message} />
    </div>
  );

  const timeline = (
    <Timeline
      timestamps={timelineTimestamps}
      activeTimestamp={snapshot.activeTimestamp}
      isPlaying={snapshot.isPlaying}
      isLoading={controlsDisabled}
      onSelect={(timestamp) => orchestrator()?.selectTimestamp(timestamp)}
      onPrevious={() => orchestrator()?.previous()}
      onNext={() => orchestrator()?.next()}
      onPlay={() => orchestrator()?.play()}
      onPause={() => orchestrator()?.pause()}
    />
  );

  return (
    <div
      className={styles.viewer}
      data-weather-viewer
      data-active-layer={snapshot.activeLayer}
      data-active-timestamp={snapshot.activeTimestamp}
      data-frame-loading={snapshot.isFrameLoading ? 'true' : 'false'}
    >
      <WeatherViewerShell
        airportPanel={airportPanel}
        layerPanel={layerPanel}
        timeline={timeline}
        controllerFactory={controllerFactory}
      />

      <div className={styles.headerControls}>
        <div className={styles.utc} aria-label="UTC visible sincronizado">
          <span>UTC / ZULU</span>
          <strong>{zuluHour(snapshot.activeTimestamp)}</strong>
        </div>
        <ViewerActions
          onReset={() => orchestrator()?.reset()}
          onRetry={hasPrimaryError ? () => orchestrator()?.retry() : undefined}
          isLoading={snapshot.catalogStatus === 'loading' || snapshot.isFrameLoading}
        />
      </div>
    </div>
  );
}
