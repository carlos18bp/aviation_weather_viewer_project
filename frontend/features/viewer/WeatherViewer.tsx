'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { AirportPanel } from '@/components/weather/AirportPanel';
import { AirportSearch } from '@/components/weather/AirportSearch';
import { AirportTrend } from '@/components/weather/AirportTrend';
import { LayerSelector } from '@/components/weather/LayerSelector';
import { PresentationMode } from '@/components/weather/PresentationMode';
import { RoutePlanner } from '@/components/weather/RoutePlanner';
import { RouteProfile } from '@/components/weather/RouteProfile';
import { SceneShare } from '@/components/weather/SceneShare';
import { Timeline } from '@/components/weather/Timeline';
import { ViewerActions } from '@/components/weather/ViewerActions';
import {
  ViewerStatus,
  type ViewerStatusKind,
} from '@/components/weather/ViewerStatus';
import { WeatherLegend } from '@/components/weather/WeatherLegend';
import { WeatherPicker } from '@/components/weather/WeatherPicker';
import {
  WeatherViewerShell,
  type WeatherMapControllerFactory,
} from '@/components/weather/WeatherViewerShell';
import {
  DEMO_TIMESTAMPS,
  useAirportWeatherSeries,
  type AirportFeature,
} from '@/features/airports';
import {
  DEFAULT_VIEWER_SCENE,
  parseViewerScene,
  serializeViewerScene,
  type ViewerScene,
} from '@/features/presentation';
import { PRECIPITATION_LEGEND } from '@/features/weather/precipitation';
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
  if (error) return { kind: 'error', message: error };
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

function PresentationSummary({ snapshot }: { snapshot: ViewerSnapshot }) {
  const hasSelection = Boolean(
    snapshot.selectedAirport || snapshot.selectedCoordinate || snapshot.selectedRoute,
  );
  return (
    <section className={styles.presentationSummary} aria-label="Resumen de escena activa">
      <p className={styles.kicker}>Escena activa</p>
      {!hasSelection && <p>Sin selecciones secundarias.</p>}
      {snapshot.selectedAirport && (
        <p><strong>Aeropuerto</strong><span>{snapshot.selectedAirport}</span></p>
      )}
      {snapshot.selectedCoordinate && (
        <p>
          <strong>Picker</strong>
          <span>
            {snapshot.selectedCoordinate[1].toFixed(2)}°,{' '}
            {snapshot.selectedCoordinate[0].toFixed(2)}°
          </span>
        </p>
      )}
      {snapshot.selectedRoute && (
        <p>
          <strong>Ruta</strong>
          <span>
            {snapshot.selectedRoute.originIcao} → {snapshot.selectedRoute.destinationIcao}
          </span>
        </p>
      )}
    </section>
  );
}

function sceneFromSnapshot(snapshot: ViewerSnapshot): ViewerScene {
  return {
    layer: snapshot.activeLayer,
    timestamp: snapshot.activeTimestamp,
    viewport: { ...snapshot.mapViewport },
    airport: snapshot.selectedAirport,
    picker: snapshot.selectedCoordinate ? [...snapshot.selectedCoordinate] : null,
    route: snapshot.selectedRoute ? { ...snapshot.selectedRoute } : null,
    isobarsVisible: snapshot.isobarsVisible,
    presentationMode: snapshot.presentationMode,
  };
}

export interface WeatherViewerProps {
  initialScene?: ViewerScene;
}

export function WeatherViewer({ initialScene }: WeatherViewerProps) {
  const initialSceneRef = useRef<ViewerScene | null>(null);
  if (initialSceneRef.current === null) {
    initialSceneRef.current = initialScene ?? (
      typeof window === 'undefined'
        ? DEFAULT_VIEWER_SCENE
        : parseViewerScene(window.location.search)
    );
  }
  const bootstrapScene = initialSceneRef.current;
  const [snapshot, setSnapshot] = useState<ViewerSnapshot>({
    ...INITIAL_VIEWER_SNAPSHOT,
    mapViewport: { ...INITIAL_VIEWER_SNAPSHOT.mapViewport },
  });
  const orchestratorRef = useRef<ViewerOrchestrator | null>(null);
  const airportTrend = useAirportWeatherSeries(snapshot.selectedAirport);

  const controllerFactory = useCallback<WeatherMapControllerFactory>((options) => {
    const orchestrator = new ViewerOrchestrator({
      ...options,
      initialScene: bootstrapScene,
      onSnapshot: setSnapshot,
    });
    orchestratorRef.current = orchestrator;
    return orchestrator;
  }, [bootstrapScene]);

  const orchestrator = () => orchestratorRef.current;
  const selectedAirport = (snapshot.airports?.features as AirportFeature[] | undefined)?.find(
    (airport) => airport.properties.icao_code === snapshot.selectedAirport,
  ) ?? null;
  const legend = snapshot.activeLayer === 'temperature'
    ? TEMPERATURE_LEGEND
    : snapshot.activeLayer === 'precipitation'
      ? PRECIPITATION_LEGEND
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
  const sceneUrl = useMemo(() => {
    const suffix = serializeViewerScene(sceneFromSnapshot(snapshot));
    if (typeof window === 'undefined') return `https://demo.local/${suffix}`;
    return `${window.location.origin}${window.location.pathname}${suffix}`;
  }, [snapshot]);

  let airportPanel;
  if (snapshot.presentationMode) {
    airportPanel = <PresentationSummary snapshot={snapshot} />;
  } else if (snapshot.airportsStatus === 'ready' && snapshot.airports) {
    airportPanel = (
      <div className={styles.leftPanel} data-testid="enriched-airport-panel">
        <AirportSearch
          airports={snapshot.airports}
          selectedAirport={snapshot.selectedAirport}
          disabled={controlsDisabled}
          onSelectAirport={(icaoCode) => orchestrator()?.selectAirport(icaoCode)}
        />
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
        {selectedAirport && (
          <AirportTrend
            airport={selectedAirport}
            points={airportTrend.points}
            activeTimestamp={snapshot.activeTimestamp}
            loading={airportTrend.loading}
            error={airportTrend.error}
            onSelectTimestamp={(timestamp) => orchestrator()?.selectTimestamp(timestamp)}
            onRetry={airportTrend.retry}
          />
        )}
      </div>
    );
  } else {
    airportPanel = (
      <AirportAvailability
        snapshot={snapshot}
        onRetry={() => orchestrator()?.retryAirports()}
      />
    );
  }

  const layerPanel = (
    <div className={styles.layerPanel} data-testid="enriched-layer-panel">
      <LayerSelector
        activeLayer={snapshot.activeLayer}
        disabled={controlsDisabled}
        onSelect={(layer) => orchestrator()?.selectLayer(layer)}
      />
      <label className={styles.isobarToggle}>
        <input
          type="checkbox"
          checked={snapshot.isobarsVisible}
          disabled={controlsDisabled}
          onChange={(event) => orchestrator()?.setIsobars(event.currentTarget.checked)}
        />
        <span>
          <strong>Isobaras</strong>
          <small>Overlay independiente · hPa</small>
        </span>
      </label>
      {snapshot.isobarError && (
        <p className={styles.overlayWarning} role="status">{snapshot.isobarError}</p>
      )}
      <WeatherLegend {...legend} />
      {!snapshot.presentationMode && snapshot.airportsStatus === 'ready' && snapshot.airports && (
        <details className={styles.routeDisclosure}>
          <summary>Ruta y viento relativo</summary>
          <RoutePlanner
            airports={snapshot.airports}
            route={snapshot.selectedRoute}
            analysis={snapshot.routeAnalysis}
            loading={snapshot.routeLoading}
            error={snapshot.routeError}
            onChange={(route) => orchestrator()?.selectRoute(route)}
            onRetry={() => orchestrator()?.retryRoute()}
          />
        </details>
      )}
      <ViewerStatus status={viewerStatus.kind} message={viewerStatus.message} />
    </div>
  );

  const timeline = (
    <Timeline
      timestamps={timelineTimestamps}
      activeTimestamp={snapshot.activeTimestamp}
      isPlaying={snapshot.isPlaying}
      isLoading={controlsDisabled}
      transition={snapshot.transition}
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
      data-isobars-visible={snapshot.isobarsVisible ? 'true' : 'false'}
      data-presentation-mode={snapshot.presentationMode ? 'true' : 'false'}
      data-transition-phase={snapshot.transition.phase}
      data-picker-active={snapshot.selectedCoordinate ? 'true' : 'false'}
      data-route-active={snapshot.selectedRoute ? 'true' : 'false'}
    >
      <WeatherViewerShell
        airportPanel={airportPanel}
        layerPanel={layerPanel}
        timeline={timeline}
        controllerFactory={controllerFactory}
      />

      {!snapshot.presentationMode && (snapshot.pickerLoading || snapshot.pickerResult) && (
        <div className={styles.pickerOverlay} data-testid="weather-picker-overlay">
          <WeatherPicker
            result={snapshot.pickerResult}
            loading={snapshot.pickerLoading}
            onClose={() => orchestrator()?.closePicker()}
            onRetry={() => orchestrator()?.retryPicker()}
          />
        </div>
      )}

      {!snapshot.presentationMode && snapshot.routeAnalysis && (
        <div className={styles.routeProfileOverlay} data-testid="route-profile-overlay">
          <RouteProfile
            analysis={snapshot.routeAnalysis}
            timestamp={snapshot.activeTimestamp}
          />
        </div>
      )}

      <div className={styles.headerControls}>
        <div className={styles.utc} aria-label="UTC visible sincronizado">
          <span>UTC / ZULU</span>
          <strong>{zuluHour(snapshot.activeTimestamp)}</strong>
        </div>
        <div className={styles.presentationControl}>
          <PresentationMode
            active={snapshot.presentationMode}
            onChange={(active) => orchestrator()?.setPresentationMode(active)}
          />
        </div>
        {!snapshot.presentationMode && (
          <div className={styles.shareControl}>
            <SceneShare url={sceneUrl} />
          </div>
        )}
        <ViewerActions
          onReset={() => orchestrator()?.reset()}
          onRetry={hasPrimaryError ? () => orchestrator()?.retry() : undefined}
          isLoading={snapshot.catalogStatus === 'loading' || snapshot.isFrameLoading}
        />
      </div>
    </div>
  );
}
