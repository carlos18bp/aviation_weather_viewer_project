import {
  createAdaptiveRenderingController,
  type VisibilityDocument,
} from '../AdaptiveRenderingController';

interface VisibilityHarness {
  document: VisibilityDocument;
  setHidden(hidden: boolean): void;
  dispatch(): void;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
}

function createVisibilityHarness(): VisibilityHarness {
  let hidden = false;
  const listeners = new Set<EventListener>();
  const addEventListener = jest.fn((_type: string, listener: EventListener) => {
    listeners.add(listener);
  });
  const removeEventListener = jest.fn((_type: string, listener: EventListener) => {
    listeners.delete(listener);
  });
  return {
    document: {
      get hidden() {
        return hidden;
      },
      addEventListener,
      removeEventListener,
    },
    setHidden(value) {
      hidden = value;
    },
    dispatch() {
      listeners.forEach((listener) => listener(new Event('visibilitychange')));
    },
    addEventListener,
    removeEventListener,
  };
}

function recordSustainedFps(
  controller: ReturnType<typeof createAdaptiveRenderingController>,
  fps: number,
  startMs = 0,
): number {
  const intervalMs = 1_000 / fps;
  let timestampMs = startMs;
  controller.recordFrame(timestampMs);
  while (timestampMs < startMs + 3_100) {
    timestampMs += intervalMs;
    controller.recordFrame(timestampMs);
  }
  return timestampMs;
}

describe('AdaptiveRenderingController', () => {
  it('degrades once and never upgrades when FPS recovers', () => {
    const onProfileChange = jest.fn();
    const controller = createAdaptiveRenderingController({
      initialProfile: 'desktop',
      document: null,
      onProfileChange,
    });
    controller.start();
    controller.setRenderingActive(true);

    const finalTimestamp = recordSustainedFps(controller, 23.9);
    recordSustainedFps(controller, 60, finalTimestamp + 20);

    expect(onProfileChange).toHaveBeenCalledTimes(1);
    expect(controller.currentProfile()).toMatchObject({
      id: 'degraded',
      particleCount: 1_500,
      preloadRadius: 0,
    });
  });

  it('does not measure while rendering is inactive', () => {
    const onProfileChange = jest.fn();
    const controller = createAdaptiveRenderingController({
      initialProfile: 'phone',
      document: null,
      onProfileChange,
    });
    controller.start();

    recordSustainedFps(controller, 10);

    expect(onProfileChange).not.toHaveBeenCalled();
    expect(controller.currentProfile().particleCount).toBe(900);
  });

  it('hidden time cannot trigger degradation and visible starts a fresh window', () => {
    const onProfileChange = jest.fn();
    const controller = createAdaptiveRenderingController({
      initialProfile: 'tablet',
      document: null,
      onProfileChange,
    });
    controller.start();
    controller.setRenderingActive(true);
    controller.recordFrame(0);
    controller.recordFrame(100);
    controller.setDocumentVisible(false);
    recordSustainedFps(controller, 5, 1_000);
    controller.setDocumentVisible(true);
    controller.recordFrame(5_000);
    controller.recordFrame(5_100);

    expect(onProfileChange).not.toHaveBeenCalled();
  });

  it('registers visibility once and removes it once across repeated lifecycle calls', () => {
    const visibility = createVisibilityHarness();
    const onDocumentVisibilityChange = jest.fn();
    const controller = createAdaptiveRenderingController({
      initialProfile: 'phone',
      document: visibility.document,
      onDocumentVisibilityChange,
    });

    controller.start();
    controller.start();
    visibility.setHidden(true);
    visibility.dispatch();
    visibility.setHidden(false);
    visibility.dispatch();
    controller.destroy();
    controller.destroy();

    expect(visibility.addEventListener).toHaveBeenCalledTimes(1);
    expect(visibility.removeEventListener).toHaveBeenCalledTimes(1);
    expect(onDocumentVisibilityChange.mock.calls.map(([visible]) => visible)).toEqual([
      true,
      false,
      true,
    ]);
  });

  it('continues without a listener when document registration fails', () => {
    const onProfileChange = jest.fn();
    const controller = createAdaptiveRenderingController({
      initialProfile: 'phone',
      document: {
        hidden: false,
        addEventListener() {
          throw new Error('listener rejected');
        },
        removeEventListener: jest.fn(),
      },
      onProfileChange,
    });
    controller.start();
    controller.setRenderingActive(true);

    recordSustainedFps(controller, 23.9);

    expect(onProfileChange).toHaveBeenCalledTimes(1);
  });
});
