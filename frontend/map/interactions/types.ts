export const TOUCH_MAP_EVENT_TYPES = [
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
] as const;

export type TouchMapEventType = (typeof TOUCH_MAP_EVENT_TYPES)[number];
export type TouchMapPoint = readonly [x: number, y: number];
export type TouchMapCoordinate = readonly [longitude: number, latitude: number];

export type TouchMapIntent =
  | { kind: 'airport'; icaoCode: string }
  | { kind: 'coordinate'; coordinate: TouchMapCoordinate }
  | { kind: 'route-airport'; icaoCode: string }
  | { kind: 'none' };

export interface TouchMapFacade {
  on(type: TouchMapEventType, listener: EventListener): void;
  off(type: TouchMapEventType, listener: EventListener): void;
  queryAirportAt(point: TouchMapPoint): string | null;
  unproject(point: TouchMapPoint): TouchMapCoordinate;
}

export interface TouchMapCoordinatorOptions {
  map: TouchMapFacade;
  isInsideCoverage(coordinate: TouchMapCoordinate): boolean;
  now?: () => number;
  onIntent(intent: TouchMapIntent): void;
  onOutsideCoverage?(): void;
}
