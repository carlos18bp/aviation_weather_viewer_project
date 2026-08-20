'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AirportPanel } from '@/components/weather/AirportPanel';
import { AirportSearch } from '@/components/weather/AirportSearch';
import { AirportTrend } from '@/components/weather/AirportTrend';
import { LayerSelector } from '@/components/weather/LayerSelector';
import { PresentationMode } from '@/components/weather/PresentationMode';
import {
  ResponsivePanelHost,
  useViewerViewport,
  type ResponsivePanelId,
  type ResponsivePanelState,
  type SheetSnapPoint,
} from '@/components/weather/ResponsivePanelHost';
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
  const [responsivePanel, setResponsivePanel] = useState<ResponsivePanelState>({
    activePanel: null,
    snapPoint: 'closed',
  });
  const { viewportMode, orientation } = useViewerViewport();
  const viewportModeRef = useRef(viewportMode);
  const orchestratorRef = useRef<ViewerOrchestrator | null>(null);
  const responsiveSelectionRef = useRef({
    airport: null as string | null,
    coordinate: null as string | null,
    route: null as string | null,
  });
  const airportTrend = useAirportWeatherSeries(snapshot.selectedAirport);

  useEffect(() => {
    viewportModeRef.current = viewportMode;
  }, [viewportMode]);

  const openResponsivePanel = useCallback((panel: ResponsivePanelId) => {
    setResponsivePanel({ activePanel: panel, snapPoint: 'peek' });
  }, []);

  const closeResponsivePanel = useCallback(() => {
    setResponsivePanel({ activePanel: null, snapPoint: 'closed' });
  }, []);

  const snapResponsivePanel = useCallback((snapPoint: SheetSnapPoint) => {
    if (snapPoint === 'closed') {
      closeResponsivePanel();
      return;
    }
    setResponsivePanel((current) => ({ ...current, snapPoint }));
  }, [closeResponsivePanel]);

  const handleSnapshot = useCallback((nextSnapshot: ViewerSnapshot) => {
    setSnapshot(nextSnapshot);

    const coordinate = nextSnapshot.selectedCoordinate?.join(',') ?? null;
    const route = nextSnapshot.selectedRoute
      ? `${nextSnapshot.selectedRoute.originIcao}-${nextSnapshot.selectedRoute.destinationIcao}`
      : null;
    const previous = responsiveSelectionRef.current;

    if (viewportModeRef.current !== 'desktop' && !nextSnapshot.presentationMode) {
      if (route !== null && route !== previous.route) {
        openResponsivePanel('route');
      } else if (coordinate !== null && coordinate !== previous.coordinate) {
        openResponsivePanel('location');
      } else if (
        nextSnapshot.selectedAirport !== null
        && nextSnapshot.selectedAirport !== previous.airport
      ) {
        openResponsivePanel('airport');
      }
    }

    responsiveSelectionRef.current = {
      airport: nextSnapshot.selectedAirport,
      coordinate,
      route,
    };
  }, [openResponsivePanel]);

  const controllerFactory = useCallback<WeatherMapControllerFactory>((options) => {
    const orchestrator = new ViewerOrchestrator({
      ...options,
      initialScene: bootstrapScene,
      onSnapshot: handleSnapshot,
    });
    orchestratorRef.current = orchestrator;
    return orchestrator;
  }, [bootstrapScene, handleSnapshot]);

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

  const handleSelectAirport = (icaoCode: string) => {
    orchestrator()?.selectAirport(icaoCode);
    if (viewportMode !== 'desktop') openResponsivePanel('airport');
  };
  const handleReset = () => {
    closeResponsivePanel();
    orchestrator()?.reset();
  };
  const handlePresentationMode = (active: boolean) => {
    if (active) closeResponsivePanel();
    orchestrator()?.setPresentationMode(active);
  };

  const airportSearch = snapshot.airportsStatus === 'ready' && snapshot.airports ? (
    <AirportSearch
      airports={snapshot.airports}
      selectedAirport={snapshot.selectedAirport}
      disabled={controlsDisabled}
      onSelectAirport={handleSelectAirport}
    />
  ) : null;

  let desktopAirportPanel;
  if (snapshot.presentationMode) {
    desktopAirportPanel = <PresentationSummary snapshot={snapshot} />;
  } else if (snapshot.airportsStatus === 'ready' && snapshot.airports) {
    desktopAirportPanel = (
      <div className={styles.leftPanel} data-testid="enriched-airport-panel">
        {airportSearch}
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
    desktopAirportPanel = (
      <AirportAvailability
        snapshot={snapshot}
        onRetry={() => orchestrator()?.retryAirports()}
      />
    );
  }

  const responsiveAirportPanel = snapshot.airportsStatus === 'ready' && snapshot.airports ? (
    <div className={styles.responsivePanelContent} data-testid="enriched-airport-panel">
      {airportSearch}
      <AirportPanel
        airport={selectedAirport}
        weather={snapshot.airportWeather}
        isLoading={Boolean(
          snapshot.selectedAirport
          && snapshot.isFrameLoading
          && snapshot.airportWeather === null,
        )}
        error={snapshot.airportError}
        onClose={() => {
          orchestrator()?.closeAirport();
          openResponsivePanel('location');
        }}
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
  ) : (
    <AirportAvailability
      snapshot={snapshot}
      onRetry={() => orchestrator()?.retryAirports()}
    />
  );

  const responsiveLocationPanel = (
    <div className={styles.responsivePanelContent} data-testid="responsive-location-panel">
      {airportSearch}
      {(snapshot.pickerLoading || snapshot.pickerResult) ? (
        <WeatherPicker
          result={snapshot.pickerResult}
          loading={snapshot.pickerLoading}
          onClose={() => {
            orchestrator()?.closePicker();
            closeResponsivePanel();
          }}
          onRetry={() => orchestrator()?.retryPicker()}
        />
      ) : (
        <section className={styles.panelGuidance} aria-label="Exploración por lugar">
          <p className={styles.kicker}>Lugar</p>
          <h2>Busca un aeropuerto o toca el mapa</h2>
          <p>
            El mapa permanece disponible mientras este panel está contraído.
            Otro toque mueve el picker sin necesidad de arrastrarlo.
          </p>
        </section>
      )}
    </div>
  );

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
      {viewportMode === 'desktop'
        && !snapshot.presentationMode
        && snapshot.airportsStatus === 'ready'
        && snapshot.airports && (
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

  const responsiveRoutePanel = snapshot.airportsStatus === 'ready' && snapshot.airports ? (
    <div className={styles.responsivePanelContent} data-testid="responsive-route-panel">
      <RoutePlanner
        airports={snapshot.airports}
        route={snapshot.selectedRoute}
        analysis={snapshot.routeAnalysis}
        loading={snapshot.routeLoading}
        error={snapshot.routeError}
        onChange={(route) => orchestrator()?.selectRoute(route)}
        onRetry={() => orchestrator()?.retryRoute()}
      />
      {snapshot.routeAnalysis && (
        <RouteProfile
          analysis={snapshot.routeAnalysis}
          timestamp={snapshot.activeTimestamp}
        />
      )}
    </div>
  ) : (
    <AirportAvailability
      snapshot={snapshot}
      onRetry={() => orchestrator()?.retryAirports()}
    />
  );

  const responsiveMorePanel = (
    <div className={`${styles.responsivePanelContent} ${styles.morePanel}`}>
      <PresentationMode
        active={snapshot.presentationMode}
        onChange={handlePresentationMode}
      />
      <SceneShare url={sceneUrl} />
      <ViewerActions
        onReset={handleReset}
        onRetry={hasPrimaryError ? () => orchestrator()?.retry() : undefined}
        isLoading={snapshot.catalogStatus === 'loading' || snapshot.isFrameLoading}
      />
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
      compact={viewportMode === 'phone'}
    />
  );

  const responsivePanels = {
    layers: layerPanel,
    location: responsiveLocationPanel,
    airport: viewportMode === 'desktop' ? desktopAirportPanel : responsiveAirportPanel,
    route: responsiveRoutePanel,
    more: responsiveMorePanel,
  };

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
      data-viewport-mode={viewportMode}
      data-orientation={orientation}
      data-active-panel={responsivePanel.activePanel ?? 'none'}
      data-snap-point={responsivePanel.snapPoint}
    >
      <WeatherViewerShell
        responsivePanelHost={(
          <ResponsivePanelHost
            viewportMode={viewportMode}
            orientation={orientation}
            activePanel={responsivePanel.activePanel}
            snapPoint={responsivePanel.snapPoint}
            panels={responsivePanels}
            onOpen={openResponsivePanel}
            onSnap={snapResponsivePanel}
            onClose={closeResponsivePanel}
          />
        )}
        timeline={timeline}
        controllerFactory={controllerFactory}
      />

      {viewportMode === 'desktop'
        && !snapshot.presentationMode
        && (snapshot.pickerLoading || snapshot.pickerResult) && (
        <div className={styles.pickerOverlay} data-testid="weather-picker-overlay">
          <WeatherPicker
            result={snapshot.pickerResult}
            loading={snapshot.pickerLoading}
            onClose={() => orchestrator()?.closePicker()}
            onRetry={() => orchestrator()?.retryPicker()}
          />
        </div>
      )}

      {viewportMode === 'desktop' && !snapshot.presentationMode && snapshot.routeAnalysis && (
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
        {(viewportMode === 'desktop' || snapshot.presentationMode) && (
          <div className={styles.presentationControl}>
            <PresentationMode
              active={snapshot.presentationMode}
              onChange={handlePresentationMode}
            />
          </div>
        )}
        {viewportMode === 'desktop' && !snapshot.presentationMode && (
          <div className={styles.shareControl}>
            <SceneShare url={sceneUrl} />
          </div>
        )}
        {viewportMode === 'desktop' && (
          <ViewerActions
            onReset={handleReset}
            onRetry={hasPrimaryError ? () => orchestrator()?.retry() : undefined}
            isLoading={snapshot.catalogStatus === 'loading' || snapshot.isFrameLoading}
          />
        )}
      </div>
    </div>
  );
}
