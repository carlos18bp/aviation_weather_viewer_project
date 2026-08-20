const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export const PLAYBACK_INTERVAL_MS = 1500;
export const TEMPORAL_EXIT_DURATION_MS = 120;
export const TEMPORAL_ENTER_DURATION_MS = 180;

export interface TemporalFramePlan {
  previous: string;
  active: string;
  next: string;
}

function parseHourlyTimestamp(isoTimestamp: string): Date {
  if (!ISO_TIMESTAMP_PATTERN.test(isoTimestamp)) {
    throw new RangeError('Expected a complete ISO timestamp.');
  }

  const timestamp = new Date(isoTimestamp);
  if (
    Number.isNaN(timestamp.getTime())
    || timestamp.getUTCMinutes() !== 0
    || timestamp.getUTCSeconds() !== 0
    || timestamp.getUTCMilliseconds() !== 0
  ) {
    throw new RangeError('Expected a timestamp aligned to an exact UTC hour.');
  }

  return timestamp;
}

/** Format a complete ISO timestamp as a locale-independent UTC/Zulu hour. */
export function formatZuluTimestamp(isoTimestamp: string): string {
  const timestamp = parseHourlyTimestamp(isoTimestamp);
  return `${String(timestamp.getUTCHours()).padStart(2, '0')}:00Z`;
}

/** Return the previous value in a circular timestamp collection. */
export function getPreviousTimestamp(
  timestamps: readonly string[],
  activeTimestamp: string,
): string | null {
  const activeIndex = timestamps.indexOf(activeTimestamp);
  if (timestamps.length === 0 || activeIndex === -1) {
    return null;
  }

  return timestamps[(activeIndex - 1 + timestamps.length) % timestamps.length];
}

/** Return the next value in a circular timestamp collection. */
export function getNextTimestamp(
  timestamps: readonly string[],
  activeTimestamp: string,
): string | null {
  const activeIndex = timestamps.indexOf(activeTimestamp);
  if (timestamps.length === 0 || activeIndex === -1) {
    return null;
  }

  return timestamps[(activeIndex + 1) % timestamps.length];
}

/** Describe the only timestamp keys that a product may retain around the active frame. */
export function getTemporalFramePlan(
  timestamps: readonly string[],
  activeTimestamp: string,
): TemporalFramePlan | null {
  const previous = getPreviousTimestamp(timestamps, activeTimestamp);
  const next = getNextTimestamp(timestamps, activeTimestamp);
  if (previous === null || next === null) {
    return null;
  }

  return {
    previous,
    active: activeTimestamp,
    next,
  };
}
