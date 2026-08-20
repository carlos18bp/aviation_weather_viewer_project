import { serializeViewerScene } from './sceneCodec';
import type { ViewerScene } from './sceneTypes';


export const VIEWPORT_URL_DEBOUNCE_MS = 250;

export interface ViewerSceneUrlEnvironment {
  history: Pick<History, 'replaceState' | 'state'>;
  location: Pick<Location, 'pathname' | 'hash'>;
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(timerId: number): void;
}

export interface ViewerSceneUrlSynchronizer {
  replace(scene: ViewerScene): void;
  replaceViewport(scene: ViewerScene): void;
  flush(): void;
  destroy(): void;
}

function defaultEnvironment(): ViewerSceneUrlEnvironment {
  if (typeof window === 'undefined') {
    throw new Error('Viewer scene URL synchronization requires a browser environment.');
  }
  return {
    history: window.history,
    location: window.location,
    setTimeout: (callback, delay) => window.setTimeout(callback, delay),
    clearTimeout: (timerId) => window.clearTimeout(timerId),
  };
}

export function createViewerSceneUrlSynchronizer(
  environment: ViewerSceneUrlEnvironment = defaultEnvironment(),
): ViewerSceneUrlSynchronizer {
  let timerId: number | null = null;
  let pendingUrl: string | null = null;
  let destroyed = false;

  const buildUrl = (scene: ViewerScene) => (
    `${environment.location.pathname}${serializeViewerScene(scene)}${environment.location.hash}`
  );
  const commit = (url: string) => {
    environment.history.replaceState(environment.history.state, '', url);
  };
  const cancelPending = () => {
    if (timerId !== null) {
      environment.clearTimeout(timerId);
      timerId = null;
    }
  };

  return {
    replace(scene) {
      if (destroyed) {
        return;
      }
      cancelPending();
      pendingUrl = null;
      commit(buildUrl(scene));
    },
    replaceViewport(scene) {
      if (destroyed) {
        return;
      }
      cancelPending();
      pendingUrl = buildUrl(scene);
      timerId = environment.setTimeout(() => {
        timerId = null;
        const url = pendingUrl;
        pendingUrl = null;
        if (!destroyed && url !== null) {
          commit(url);
        }
      }, VIEWPORT_URL_DEBOUNCE_MS);
    },
    flush() {
      if (destroyed || pendingUrl === null) {
        return;
      }
      cancelPending();
      const url = pendingUrl;
      pendingUrl = null;
      commit(url);
    },
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      cancelPending();
      pendingUrl = null;
    },
  };
}
