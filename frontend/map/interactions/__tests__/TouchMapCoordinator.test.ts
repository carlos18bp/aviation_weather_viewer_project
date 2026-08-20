import {
  TOUCH_MAP_EVENT_TYPES,
  TouchMapCoordinator,
  type TouchMapCoordinate,
  type TouchMapEventType,
  type TouchMapFacade,
  type TouchMapPoint,
} from '@/map/interactions';

interface FakeTouchPoint {
  readonly clientX: number;
  readonly clientY: number;
}

interface FakeTouchEvent extends Event {
  readonly preventDefault: jest.Mock;
}

class FakeTouchMapFacade implements TouchMapFacade {
  private readonly listeners = new Map<TouchMapEventType, Set<EventListener>>();

  readonly on = jest.fn((type: TouchMapEventType, listener: EventListener) => {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  });

  readonly off = jest.fn((type: TouchMapEventType, listener: EventListener) => {
    this.listeners.get(type)?.delete(listener);
  });

  readonly queryAirportAt = jest.fn((_point: TouchMapPoint): string | null => null);
  readonly unproject = jest.fn((_point: TouchMapPoint): TouchMapCoordinate => [-74, 4]);

  emit(type: TouchMapEventType, event: Event): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }

  listenerCount(): number {
    return [...this.listeners.values()].reduce((total, listeners) => (
      total + listeners.size
    ), 0);
  }
}

function point(clientX: number, clientY: number): FakeTouchPoint {
  return { clientX, clientY };
}

function touchEvent(
  touches: readonly FakeTouchPoint[] = [],
  changedTouches: readonly FakeTouchPoint[] = [],
): FakeTouchEvent {
  return {
    touches,
    changedTouches,
    preventDefault: jest.fn(),
  } as unknown as FakeTouchEvent;
}

function createHarness() {
  const map = new FakeTouchMapFacade();
  const clock = { value: 0 };
  const onIntent = jest.fn();
  const onOutsideCoverage = jest.fn();
  const isInsideCoverage = jest.fn((coordinate: TouchMapCoordinate) => (
    coordinate[0] >= -82
      && coordinate[0] <= -66
      && coordinate[1] >= -5
      && coordinate[1] <= 14
  ));
  const coordinator = new TouchMapCoordinator({
    map,
    isInsideCoverage,
    now: () => clock.value,
    onIntent,
    onOutsideCoverage,
  });
  coordinator.attach();
  return {
    clock,
    coordinator,
    isInsideCoverage,
    map,
    onIntent,
    onOutsideCoverage,
  };
}

type Harness = ReturnType<typeof createHarness>;

function emitTap(
  harness: Harness,
  options: {
    start?: TouchMapPoint;
    end?: TouchMapPoint;
    duration?: number;
    move?: boolean;
  } = {},
): void {
  const start = options.start ?? [10, 10];
  const end = options.end ?? start;
  harness.clock.value = 0;
  harness.map.emit('touchstart', touchEvent([point(...start)]));
  if (options.move) {
    harness.map.emit('touchmove', touchEvent([point(...end)]));
  }
  harness.clock.value = options.duration ?? 100;
  harness.map.emit('touchend', touchEvent([], [point(...end)]));
}

describe('TouchMapCoordinator', () => {
  it('attaches the four stable listeners exactly once', () => {
    const { coordinator, map } = createHarness();

    coordinator.attach();

    expect(map.on.mock.calls.map(([type]) => type)).toEqual(TOUCH_MAP_EVENT_TYPES);
    expect(map.listenerCount()).toBe(4);
  });

  it('destroys the same four listeners once and cannot reattach', () => {
    const { coordinator, map } = createHarness();

    coordinator.destroy();
    coordinator.destroy();
    coordinator.attach();

    expect(map.off.mock.calls).toEqual(map.on.mock.calls);
    expect(map.off).toHaveBeenCalledTimes(4);
    expect(map.on).toHaveBeenCalledTimes(4);
    expect(map.listenerCount()).toBe(0);
  });

  it('accepts a tap lasting exactly 500 ms', () => {
    const harness = createHarness();

    emitTap(harness, { duration: 500 });

    expect(harness.onIntent).toHaveBeenCalledWith({
      kind: 'coordinate',
      coordinate: [-74, 4],
    });
  });

  it('rejects a tap lasting 501 ms', () => {
    const harness = createHarness();

    emitTap(harness, { duration: 501 });

    expect(harness.onIntent).not.toHaveBeenCalled();
    expect(harness.map.queryAirportAt).not.toHaveBeenCalled();
  });

  it('accepts exactly 8 CSS px of movement', () => {
    const harness = createHarness();

    emitTap(harness, { start: [0, 0], end: [8, 0], move: true });

    expect(harness.map.queryAirportAt).toHaveBeenCalledWith([8, 0]);
    expect(harness.onIntent).toHaveBeenCalledTimes(1);
  });

  it('rejects pan at 8.1 CSS px', () => {
    const harness = createHarness();

    emitTap(harness, { start: [0, 0], end: [8.1, 0], move: true });

    expect(harness.onIntent).not.toHaveBeenCalled();
    expect(harness.map.queryAirportAt).not.toHaveBeenCalled();
  });

  it('invalidates a gesture forever after a second finger appears', () => {
    const harness = createHarness();
    const first = point(10, 10);
    const second = point(20, 20);

    harness.map.emit('touchstart', touchEvent([first]));
    harness.map.emit('touchstart', touchEvent([first, second]));
    harness.map.emit('touchend', touchEvent([first], [second]));
    harness.map.emit('touchend', touchEvent([], [first]));

    expect(harness.onIntent).not.toHaveBeenCalled();
  });

  it('invalidates a cancelled gesture', () => {
    const harness = createHarness();

    harness.map.emit('touchstart', touchEvent([point(10, 10)]));
    harness.map.emit('touchcancel', touchEvent());
    harness.map.emit('touchend', touchEvent([], [point(10, 10)]));

    expect(harness.onIntent).not.toHaveBeenCalled();
  });

  it('gives an airport priority without unprojecting the background', () => {
    const harness = createHarness();
    harness.map.queryAirportAt.mockReturnValue('SKBO');

    emitTap(harness);

    expect(harness.onIntent).toHaveBeenCalledWith({
      kind: 'airport',
      icaoCode: 'SKBO',
    });
    expect(harness.map.unproject).not.toHaveBeenCalled();
  });

  it('applies route capture only to airport intents', () => {
    const harness = createHarness();
    harness.map.queryAirportAt.mockReturnValue('SKRG');
    harness.coordinator.setRouteCapture(true);

    emitTap(harness);
    harness.coordinator.setRouteCapture(false);
    emitTap(harness);
    harness.coordinator.setRouteCapture(true);
    harness.map.queryAirportAt.mockReturnValue(null);
    emitTap(harness);

    expect(harness.onIntent.mock.calls.map(([intent]) => intent)).toEqual([
      { kind: 'route-airport', icaoCode: 'SKRG' },
      { kind: 'airport', icaoCode: 'SKRG' },
      { kind: 'coordinate', coordinate: [-74, 4] },
    ]);
  });

  it('opens and repositions the picker with coordinate taps', () => {
    const harness = createHarness();
    harness.map.unproject
      .mockReturnValueOnce([-74, 4])
      .mockReturnValueOnce([-73, 5]);

    emitTap(harness);
    harness.coordinator.setReposition(true);
    emitTap(harness);

    expect(harness.onIntent.mock.calls.map(([intent]) => intent)).toEqual([
      { kind: 'coordinate', coordinate: [-74, 4] },
      { kind: 'coordinate', coordinate: [-73, 5] },
    ]);
  });

  it('emits none and feedback outside the bbox', () => {
    const harness = createHarness();
    harness.map.unproject.mockReturnValue([-83, 4]);

    emitTap(harness);

    expect(harness.onIntent).toHaveBeenCalledWith({ kind: 'none' });
    expect(harness.onOutsideCoverage).toHaveBeenCalledTimes(1);
  });

  it('degrades a failed airport query to coordinate resolution', () => {
    const harness = createHarness();
    harness.map.queryAirportAt.mockImplementationOnce(() => {
      throw new Error('query unavailable');
    });

    emitTap(harness);

    expect(harness.onIntent).toHaveBeenCalledWith({
      kind: 'coordinate',
      coordinate: [-74, 4],
    });
    expect(harness.onOutsideCoverage).not.toHaveBeenCalled();
  });

  it('emits none and feedback when unproject fails', () => {
    const harness = createHarness();
    harness.map.unproject.mockImplementationOnce(() => {
      throw new Error('projection unavailable');
    });

    emitTap(harness);

    expect(harness.onIntent).toHaveBeenCalledWith({ kind: 'none' });
    expect(harness.onOutsideCoverage).toHaveBeenCalledTimes(1);
  });

  it('rejects non-finite touch and projected coordinates', () => {
    const harness = createHarness();

    harness.map.emit('touchstart', touchEvent([point(Number.NaN, 10)]));
    harness.map.emit('touchend', touchEvent([], [point(Number.NaN, 10)]));
    harness.map.unproject.mockReturnValue([Number.NaN, 4]);
    emitTap(harness);

    expect(harness.map.queryAirportAt).toHaveBeenCalledTimes(1);
    expect(harness.isInsideCoverage).not.toHaveBeenCalled();
    expect(harness.onIntent).toHaveBeenCalledWith({ kind: 'none' });
    expect(harness.onOutsideCoverage).toHaveBeenCalledTimes(1);
  });

  it('resolves once on touchend and ignores repeated endings', () => {
    const harness = createHarness();

    harness.map.emit('touchstart', touchEvent([point(10, 10)]));
    harness.map.emit('touchmove', touchEvent([point(12, 10)]));
    expect(harness.onIntent).not.toHaveBeenCalled();
    harness.map.emit('touchend', touchEvent([], [point(12, 10)]));
    harness.map.emit('touchend', touchEvent([], [point(12, 10)]));

    expect(harness.onIntent).toHaveBeenCalledTimes(1);
  });

  it('never invokes preventDefault from any handler', () => {
    const harness = createHarness();
    const start = touchEvent([point(10, 10)]);
    const move = touchEvent([point(11, 10)]);
    const end = touchEvent([], [point(11, 10)]);
    const cancel = touchEvent();

    harness.map.emit('touchstart', start);
    harness.map.emit('touchmove', move);
    harness.map.emit('touchend', end);
    harness.map.emit('touchcancel', cancel);

    for (const event of [start, move, end, cancel]) {
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  });

  it('invalidates an active gesture when destroyed', () => {
    const harness = createHarness();

    harness.map.emit('touchstart', touchEvent([point(10, 10)]));
    harness.coordinator.destroy();
    harness.map.emit('touchend', touchEvent([], [point(10, 10)]));

    expect(harness.onIntent).not.toHaveBeenCalled();
    expect(harness.map.off).toHaveBeenCalledTimes(4);
  });

  it('clears gesture state before a consumer callback throws', () => {
    const harness = createHarness();
    harness.onIntent.mockImplementationOnce(() => {
      throw new Error('consumer failed');
    });

    expect(() => emitTap(harness)).toThrow('consumer failed');
    harness.coordinator.attach();
    emitTap(harness);

    expect(harness.map.on).toHaveBeenCalledTimes(4);
    expect(harness.map.listenerCount()).toBe(4);
    expect(harness.onIntent).toHaveBeenCalledTimes(2);
  });
});
