'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { DemoWarning } from '@/components/weather/DemoWarning';
import { useWeatherViewerStore } from '@/lib/stores/weatherViewerStore';
import type { WeatherMapController } from '@/lib/weather/viewerTypes';
import {
  DefaultWeatherMapController,
  type WeatherMapLifecycleCallbacks,
} from '@/map/WeatherMapController';
import { supportsWebGL2 } from '@/map/webgl';

import styles from './WeatherViewerShell.module.css';


type MapStatus = 'loading' | 'ready' | 'error';

interface MapErrorState {
  message: string;
  canRetry: boolean;
}

export interface WeatherMapControllerFactoryOptions {
  container: HTMLElement;
  callbacks: WeatherMapLifecycleCallbacks;
}

export type WeatherMapControllerFactory = (
  options: WeatherMapControllerFactoryOptions,
) => WeatherMapController;

export interface WeatherViewerShellProps {
  airportPanel?: ReactNode;
  layerPanel?: ReactNode;
  responsivePanelHost?: ReactNode;
  timeline?: ReactNode;
  utcLabel?: string;
  controllerFactory?: WeatherMapControllerFactory;
}

const defaultControllerFactory: WeatherMapControllerFactory = (options) => (
  new DefaultWeatherMapController(options)
);

function EmptyPanelSlot() {
  return (
    <div className={styles.slotSkeleton} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function EmptyTimelineSlot() {
  return (
    <div className={styles.timelineSkeleton} aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
    </div>
  );
}

export function WeatherViewerShell({
  airportPanel,
  layerPanel,
  responsivePanelHost,
  timeline,
  utcLabel = '06Z',
  controllerFactory = defaultControllerFactory,
}: WeatherViewerShellProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading');
  const [mapError, setMapError] = useState<MapErrorState | null>(null);
  const setMapReady = useWeatherViewerStore((state) => state.setMapReady);

  useEffect(() => {
    const container = mapContainerRef.current;
    let isActive = true;
    let resizeObserver: ResizeObserver | null = null;
    let controller: WeatherMapController | null = null;

    setMapReady(false);

    if (!container || !supportsWebGL2()) {
      const errorTimer = window.setTimeout(() => {
        if (!isActive) return;
        setMapStatus('error');
        setMapError({
          message: 'Este navegador no ofrece WebGL2. El visor cartográfico no puede iniciarse.',
          canRetry: false,
        });
      }, 0);
      return () => {
        isActive = false;
        window.clearTimeout(errorTimer);
        setMapReady(false);
      };
    }

    controller = controllerFactory({
      container,
      callbacks: {
        onReady: () => {
          if (!isActive) {
            return;
          }
          setMapStatus('ready');
          setMapReady(true);
        },
        onError: (error) => {
          if (!isActive) {
            return;
          }
          setMapStatus('error');
          setMapReady(false);
          setMapError({
            message: error.message || 'No se pudo cargar el mapa local.',
            canRetry: true,
          });
        },
      },
    });

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => controller?.resize());
      resizeObserver.observe(container);
    }

    void controller.initialize().catch((error: unknown) => {
      if (!isActive) {
        return;
      }
      const message = error instanceof Error ? error.message : 'No se pudo inicializar el mapa local.';
      setMapStatus('error');
      setMapReady(false);
      setMapError({ message, canRetry: true });
    });

    return () => {
      isActive = false;
      resizeObserver?.disconnect();
      controller?.destroy();
      setMapReady(false);
    };
  }, [attempt, controllerFactory, setMapReady]);

  const retryMap = () => {
    setMapStatus('loading');
    setMapError(null);
    setAttempt((current) => current + 1);
  };

  return (
    <main className={styles.shell} data-map-status={mapStatus}>
      <div className={styles.mapViewport}>
        <div
          ref={mapContainerRef}
          className={styles.mapCanvas}
          data-testid="weather-map-container"
          aria-label="Mapa meteorológico navegable de Colombia"
        />
        <div className={styles.mapScrim} aria-hidden="true" />
      </div>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Demo Colombia · escenario 2026-01-15</p>
          <h1 aria-label="Meteorología Aeronáutica · Demo ProjectApp">
            <span className={styles.fullTitle}>Meteorología Aeronáutica · Demo ProjectApp</span>
            <span className={styles.compactTitle} aria-hidden="true">Meteo aeronáutica</span>
          </h1>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.mapStatus} role="status">
            {mapStatus === 'ready' ? 'Mapa local listo' : mapStatus === 'error' ? 'Mapa no disponible' : 'Cargando mapa local'}
          </span>
          <div className={styles.time} aria-label="Hora seleccionada">
            <span>UTC / ZULU</span>
            <strong>{utcLabel}</strong>
          </div>
        </div>
      </header>

      <section className={styles.stage} aria-label="Shell del visor meteorológico">
        {responsivePanelHost ?? (
          <>
            <aside className={`${styles.panelSlot} ${styles.airportSlot}`} aria-label="Slot para panel aeroportuario">
              {airportPanel ?? <EmptyPanelSlot />}
            </aside>
            <aside className={`${styles.panelSlot} ${styles.layerSlot}`} aria-label="Slot para capas y leyenda">
              {layerPanel ?? <EmptyPanelSlot />}
            </aside>
          </>
        )}
      </section>

      {mapStatus === 'loading' && (
        <div className={styles.loadingSurface} role="status">
          <span className={styles.loadingPulse} aria-hidden="true" />
          Preparando mapa local de Colombia…
        </div>
      )}

      {mapStatus === 'error' && mapError && (
        <section className={styles.errorSurface} role="alert">
          <p className={styles.eyebrow}>Visor cartográfico</p>
          <h2>Mapa no disponible</h2>
          <p>{mapError.message}</p>
          {mapError.canRetry && (
            <button type="button" onClick={retryMap}>
              Reintentar
            </button>
          )}
        </section>
      )}

      <footer className={styles.footer}>
        <div className={styles.warning}>
          <DemoWarning />
        </div>
        <section className={styles.timelineSlot} aria-label="Slot para controles y línea de tiempo">
          {timeline ?? <EmptyTimelineSlot />}
        </section>
      </footer>
    </main>
  );
}
