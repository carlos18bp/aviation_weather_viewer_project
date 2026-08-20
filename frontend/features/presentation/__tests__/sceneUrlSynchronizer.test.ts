import {
  createViewerSceneUrlSynchronizer,
  VIEWPORT_URL_DEBOUNCE_MS,
  type ViewerSceneUrlEnvironment,
} from '../sceneUrlSynchronizer';
import { DEFAULT_VIEWER_SCENE, type ViewerScene } from '../sceneTypes';


function scene(latitude: number): ViewerScene {
  return {
    ...DEFAULT_VIEWER_SCENE,
    viewport: { ...DEFAULT_VIEWER_SCENE.viewport, latitude },
  };
}

function createEnvironment() {
  const replaceState = jest.fn();
  const environment: ViewerSceneUrlEnvironment = {
    history: { state: { preserved: true }, replaceState } as unknown as History,
    location: { pathname: '/viewer', hash: '#demo' } as Location,
    setTimeout: (callback, delay) => window.setTimeout(callback, delay),
    clearTimeout: (timerId) => window.clearTimeout(timerId),
  };
  return { environment, replaceState };
}

describe('ViewerSceneUrlSynchronizer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replaces stable scene state immediately without adding history entries', () => {
    const { environment, replaceState } = createEnvironment();
    const synchronizer = createViewerSceneUrlSynchronizer(environment);

    synchronizer.replace(scene(5.25));

    expect(replaceState).toHaveBeenCalledWith(
      { preserved: true },
      '',
      '/viewer?lat=5.25#demo',
    );
  });

  it('debounces viewport changes and commits only the last scene', () => {
    const { environment, replaceState } = createEnvironment();
    const synchronizer = createViewerSceneUrlSynchronizer(environment);

    synchronizer.replaceViewport(scene(5.25));
    synchronizer.replaceViewport(scene(6.5));
    jest.advanceTimersByTime(VIEWPORT_URL_DEBOUNCE_MS - 1);
    expect(replaceState).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenLastCalledWith(
      { preserved: true },
      '',
      '/viewer?lat=6.50#demo',
    );
  });

  it('flush publishes the pending viewport immediately', () => {
    const { environment, replaceState } = createEnvironment();
    const synchronizer = createViewerSceneUrlSynchronizer(environment);

    synchronizer.replaceViewport(scene(7.75));
    synchronizer.flush();
    jest.runOnlyPendingTimers();

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState.mock.calls[0][2]).toBe('/viewer?lat=7.75#demo');
  });

  it('an immediate state change cancels a pending viewport update', () => {
    const { environment, replaceState } = createEnvironment();
    const synchronizer = createViewerSceneUrlSynchronizer(environment);

    synchronizer.replaceViewport(scene(7.75));
    synchronizer.replace({
      ...scene(8.25),
      presentationMode: true,
    });
    jest.runOnlyPendingTimers();

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState.mock.calls[0][2]).toBe('/viewer?lat=8.25&mode=present#demo');
  });

  it('destroy clears pending work and makes cleanup idempotent', () => {
    const { environment, replaceState } = createEnvironment();
    const synchronizer = createViewerSceneUrlSynchronizer(environment);

    synchronizer.replaceViewport(scene(5.25));
    synchronizer.destroy();
    synchronizer.destroy();
    synchronizer.replace(scene(6.5));
    jest.runOnlyPendingTimers();

    expect(replaceState).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
