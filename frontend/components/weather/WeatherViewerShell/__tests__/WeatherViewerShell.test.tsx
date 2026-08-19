import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { useWeatherViewerStore } from '@/lib/stores/weatherViewerStore';
import type { WeatherMapController } from '@/lib/weather/viewerTypes';
import { supportsWebGL2 } from '@/map/webgl';

import {
  WeatherViewerShell,
  type WeatherMapControllerFactory,
  type WeatherMapControllerFactoryOptions,
} from '../WeatherViewerShell';


jest.mock('@/map/webgl', () => ({
  supportsWebGL2: jest.fn(),
}));

const mockedSupportsWebGL2 = jest.mocked(supportsWebGL2);

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  readonly observe = jest.fn();
  readonly disconnect = jest.fn();

  constructor(readonly callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }
}

function createController(): jest.Mocked<WeatherMapController> {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    setLayer: jest.fn(),
    setWeatherFrame: jest.fn().mockResolvedValue(undefined),
    setAirports: jest.fn(),
    setSelectedAirport: jest.fn(),
    focusAirport: jest.fn(),
    resize: jest.fn(),
    reset: jest.fn(),
    destroy: jest.fn(),
  };
}

function createFactory(controllers: jest.Mocked<WeatherMapController>[]) {
  const callbacks: WeatherMapControllerFactoryOptions['callbacks'][] = [];
  const factory = jest.fn<ReturnType<WeatherMapControllerFactory>, Parameters<WeatherMapControllerFactory>>(
    (options) => {
      callbacks.push(options.callbacks);
      return controllers[Math.min(callbacks.length - 1, controllers.length - 1)];
    },
  );
  return { factory, callbacks };
}

describe('WeatherViewerShell', () => {
  beforeEach(() => {
    mockedSupportsWebGL2.mockReturnValue(true);
    MockResizeObserver.instances = [];
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });
    useWeatherViewerStore.getState().reset();
  });

  it('shows a controlled error when WebGL2 is unavailable', () => {
    mockedSupportsWebGL2.mockReturnValue(false);
    const controller = createController();
    const { factory } = createFactory([controller]);

    render(<WeatherViewerShell controllerFactory={factory} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Este navegador no ofrece WebGL2');
    expect(factory).not.toHaveBeenCalled();
  });

  it('initializes one controller for the map container', async () => {
    const controller = createController();
    const { factory } = createFactory([controller]);

    render(<WeatherViewerShell controllerFactory={factory} />);

    await waitFor(() => expect(controller.initialize).toHaveBeenCalledTimes(1));
    expect(factory).toHaveBeenCalledWith(expect.objectContaining({
      container: screen.getByTestId('weather-map-container'),
    }));
  });

  it('keeps the controller when viewer state changes', async () => {
    const controller = createController();
    const { factory } = createFactory([controller]);
    render(<WeatherViewerShell controllerFactory={factory} />);
    await waitFor(() => expect(controller.initialize).toHaveBeenCalledTimes(1));

    act(() => useWeatherViewerStore.getState().setActiveLayer('temperature'));

    expect(factory).toHaveBeenCalledTimes(1);
    expect(controller.destroy).not.toHaveBeenCalled();
  });

  it('publishes map readiness after controller load', async () => {
    const controller = createController();
    const { factory, callbacks } = createFactory([controller]);
    render(<WeatherViewerShell controllerFactory={factory} />);
    await waitFor(() => expect(callbacks).toHaveLength(1));

    act(() => callbacks[0].onReady?.());

    expect(screen.getByRole('status')).toHaveTextContent('Mapa local listo');
    expect(useWeatherViewerStore.getState().isMapReady).toBe(true);
  });

  it('offers retry after initialization failure', async () => {
    const controller = createController();
    controller.initialize.mockRejectedValue(new Error('style unavailable'));
    const { factory } = createFactory([controller]);

    render(<WeatherViewerShell controllerFactory={factory} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('style unavailable');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('replaces the failed controller during retry', async () => {
    const failedController = createController();
    failedController.initialize.mockRejectedValue(new Error('style unavailable'));
    const replacementController = createController();
    const { factory } = createFactory([failedController, replacementController]);
    render(<WeatherViewerShell controllerFactory={factory} />);
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(factory).toHaveBeenCalledTimes(2));
    expect(failedController.destroy).toHaveBeenCalledTimes(1);
  });

  it('resizes through the container observer', async () => {
    const controller = createController();
    const { factory } = createFactory([controller]);
    render(<WeatherViewerShell controllerFactory={factory} />);
    await waitFor(() => expect(MockResizeObserver.instances).toHaveLength(1));

    act(() => {
      const observer = MockResizeObserver.instances[0];
      observer.callback([], observer as unknown as ResizeObserver);
    });

    expect(controller.resize).toHaveBeenCalledTimes(1);
  });

  it('cleans controller resources on unmount', async () => {
    const controller = createController();
    const { factory } = createFactory([controller]);
    const { unmount } = render(<WeatherViewerShell controllerFactory={factory} />);
    await waitFor(() => expect(MockResizeObserver.instances).toHaveLength(1));

    unmount();

    expect(controller.destroy).toHaveBeenCalledTimes(1);
    expect(MockResizeObserver.instances[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('renders the three composition slots', () => {
    const controller = createController();
    const { factory } = createFactory([controller]);

    render(
      <WeatherViewerShell
        controllerFactory={factory}
        airportPanel={<span>Airport slot content</span>}
        layerPanel={<span>Layer slot content</span>}
        timeline={<span>Timeline slot content</span>}
      />,
    );

    expect(screen.getByText('Airport slot content')).toBeInTheDocument();
    expect(screen.getByText('Layer slot content')).toBeInTheDocument();
    expect(screen.getByText('Timeline slot content')).toBeInTheDocument();
  });

  it('keeps the operational warning visible in error state', () => {
    mockedSupportsWebGL2.mockReturnValue(false);

    render(<WeatherViewerShell />);

    expect(screen.getByText(
      'DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL',
    )).toBeInTheDocument();
  });
});
