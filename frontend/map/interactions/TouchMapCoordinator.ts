import {
  TOUCH_MAP_EVENT_TYPES,
  type TouchMapCoordinate,
  type TouchMapCoordinatorOptions,
  type TouchMapEventType,
  type TouchMapIntent,
  type TouchMapPoint,
} from './types';

export const TOUCH_TAP_MAX_DURATION_MS = 500;
export const TOUCH_TAP_MAX_MOVEMENT_PX = 8;

interface TouchPointLike {
  readonly clientX: number;
  readonly clientY: number;
}

interface TouchEventLike extends Event {
  readonly touches?: ArrayLike<TouchPointLike>;
  readonly changedTouches?: ArrayLike<TouchPointLike>;
}

interface GestureState {
  readonly startPoint: TouchMapPoint;
  readonly startedAt: number;
  maximumTouchCount: number;
  maximumMovement: number;
}

function touchCount(touches: ArrayLike<TouchPointLike> | undefined): number {
  if (!touches || !Number.isInteger(touches.length) || touches.length < 0) {
    return 0;
  }
  return touches.length;
}

function firstPoint(
  touches: ArrayLike<TouchPointLike> | undefined,
): TouchMapPoint | null {
  if (touchCount(touches) === 0) {
    return null;
  }
  const touch = touches?.[0];
  if (!touch || !Number.isFinite(touch.clientX) || !Number.isFinite(touch.clientY)) {
    return null;
  }
  return [touch.clientX, touch.clientY];
}

function distanceBetween(start: TouchMapPoint, end: TouchMapPoint): number {
  return Math.hypot(end[0] - start[0], end[1] - start[1]);
}

function isFiniteCoordinate(coordinate: TouchMapCoordinate): boolean {
  return Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]);
}

export class TouchMapCoordinator {
  private readonly now: () => number;
  private readonly listeners: Record<TouchMapEventType, EventListener>;
  private gesture: GestureState | null = null;
  private routeCaptureActive = false;
  private repositionActive = false;
  private attached = false;
  private destroyed = false;

  constructor(private readonly options: TouchMapCoordinatorOptions) {
    this.now = options.now ?? Date.now;
    this.listeners = {
      touchstart: (event) => this.handleTouchStart(event),
      touchmove: (event) => this.handleTouchMove(event),
      touchend: (event) => this.handleTouchEnd(event),
      touchcancel: () => this.handleTouchCancel(),
    };
  }

  attach(): void {
    if (this.attached || this.destroyed) {
      return;
    }

    const registered: TouchMapEventType[] = [];
    try {
      for (const type of TOUCH_MAP_EVENT_TYPES) {
        this.options.map.on(type, this.listeners[type]);
        registered.push(type);
      }
      this.attached = true;
    } catch (error) {
      for (const type of registered.reverse()) {
        this.options.map.off(type, this.listeners[type]);
      }
      throw error;
    }
  }

  setRouteCapture(active: boolean): void {
    if (!this.destroyed) {
      this.routeCaptureActive = active;
    }
  }

  setReposition(active: boolean): void {
    if (!this.destroyed) {
      this.repositionActive = active;
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.gesture = null;
    this.routeCaptureActive = false;
    this.repositionActive = false;

    if (this.attached) {
      for (const type of TOUCH_MAP_EVENT_TYPES) {
        this.options.map.off(type, this.listeners[type]);
      }
      this.attached = false;
    }
  }

  private handleTouchStart(event: Event): void {
    if (this.destroyed) {
      return;
    }

    const touchEvent = event as TouchEventLike;
    const currentTouchCount = touchCount(touchEvent.touches);
    const point = firstPoint(touchEvent.touches);

    if (this.gesture) {
      this.gesture.maximumTouchCount = Math.max(
        this.gesture.maximumTouchCount,
        currentTouchCount,
      );
      if (currentTouchCount !== 1 || !point) {
        this.gesture.maximumTouchCount = Math.max(
          this.gesture.maximumTouchCount,
          2,
        );
        return;
      }
      this.updateMovement(point);
      return;
    }

    if (currentTouchCount !== 1 || !point) {
      return;
    }

    const startedAt = this.now();
    if (!Number.isFinite(startedAt)) {
      return;
    }
    this.gesture = {
      startPoint: point,
      startedAt,
      maximumTouchCount: 1,
      maximumMovement: 0,
    };
  }

  private handleTouchMove(event: Event): void {
    if (!this.gesture || this.destroyed) {
      return;
    }

    const touchEvent = event as TouchEventLike;
    const currentTouchCount = touchCount(touchEvent.touches);
    this.gesture.maximumTouchCount = Math.max(
      this.gesture.maximumTouchCount,
      currentTouchCount,
    );
    const point = firstPoint(touchEvent.touches);
    if (currentTouchCount !== 1 || !point) {
      this.gesture.maximumTouchCount = Math.max(
        this.gesture.maximumTouchCount,
        2,
      );
      return;
    }
    this.updateMovement(point);
  }

  private handleTouchEnd(event: Event): void {
    if (!this.gesture || this.destroyed) {
      return;
    }

    const touchEvent = event as TouchEventLike;
    const activeTouchCount = touchCount(touchEvent.touches);
    const endedTouchCount = touchCount(touchEvent.changedTouches);
    this.gesture.maximumTouchCount = Math.max(
      this.gesture.maximumTouchCount,
      activeTouchCount + endedTouchCount,
    );

    if (activeTouchCount > 0) {
      return;
    }

    const finalPoint = firstPoint(touchEvent.changedTouches);
    if (finalPoint) {
      this.updateMovement(finalPoint);
    }

    const gesture = this.gesture;
    this.gesture = null;
    const endedAt = this.now();
    const duration = endedAt - gesture.startedAt;
    const eligible = finalPoint !== null
      && Number.isFinite(endedAt)
      && duration >= 0
      && duration <= TOUCH_TAP_MAX_DURATION_MS
      && gesture.maximumTouchCount === 1
      && gesture.maximumMovement <= TOUCH_TAP_MAX_MOVEMENT_PX;

    if (eligible) {
      this.resolveIntent(finalPoint);
    }
  }

  private handleTouchCancel(): void {
    this.gesture = null;
  }

  private updateMovement(point: TouchMapPoint): void {
    if (!this.gesture) {
      return;
    }
    this.gesture.maximumMovement = Math.max(
      this.gesture.maximumMovement,
      distanceBetween(this.gesture.startPoint, point),
    );
  }

  private resolveIntent(point: TouchMapPoint): void {
    const airport = this.queryAirport(point);
    if (airport) {
      const intent: TouchMapIntent = this.routeCaptureActive
        ? { kind: 'route-airport', icaoCode: airport }
        : { kind: 'airport', icaoCode: airport };
      this.options.onIntent(intent);
      return;
    }

    let coordinate: TouchMapCoordinate;
    try {
      coordinate = this.options.map.unproject(point);
    } catch {
      this.emitNoneWithFeedback();
      return;
    }

    if (!isFiniteCoordinate(coordinate)) {
      this.emitNoneWithFeedback();
      return;
    }

    let isInsideCoverage = false;
    try {
      isInsideCoverage = this.options.isInsideCoverage(coordinate);
    } catch {
      this.emitNoneWithFeedback();
      return;
    }

    if (!isInsideCoverage) {
      this.emitNoneWithFeedback();
      return;
    }

    if (this.repositionActive) {
      this.repositionActive = false;
    }
    this.options.onIntent({ kind: 'coordinate', coordinate: [...coordinate] });
  }

  private queryAirport(point: TouchMapPoint): string | null {
    try {
      const airport = this.options.map.queryAirportAt(point);
      if (typeof airport !== 'string' || airport.trim() === '') {
        return null;
      }
      return airport.trim();
    } catch {
      return null;
    }
  }

  private emitNoneWithFeedback(): void {
    try {
      this.options.onIntent({ kind: 'none' });
    } finally {
      this.options.onOutsideCoverage?.();
    }
  }
}
