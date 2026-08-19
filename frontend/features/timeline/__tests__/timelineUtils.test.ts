import {
  formatZuluTimestamp,
  getNextTimestamp,
  getPreviousTimestamp,
} from '../timelineUtils';


const TIMESTAMPS = [
  '2026-01-15T00:00:00Z',
  '2026-01-15T03:00:00Z',
  '2026-01-15T06:00:00Z',
  '2026-01-15T09:00:00Z',
  '2026-01-15T12:00:00Z',
  '2026-01-15T15:00:00Z',
] as const;

describe('timelineUtils', () => {
  it('formats ISO timestamps as locale-independent UTC/Zulu hours', () => {
    expect(formatZuluTimestamp('2026-01-15T06:00:00Z')).toBe('06:00Z');
    expect(formatZuluTimestamp('2026-01-15T01:00:00-05:00')).toBe('06:00Z');
  });

  it('rejects malformed and non-hourly timestamps', () => {
    expect(() => formatZuluTimestamp('not-a-timestamp')).toThrow(RangeError);
    expect(() => formatZuluTimestamp('2026-01-15T06:30:00Z')).toThrow(RangeError);
  });

  it('moves to adjacent timestamps without changing the input', () => {
    const snapshot = [...TIMESTAMPS];

    expect(getPreviousTimestamp(TIMESTAMPS, TIMESTAMPS[2])).toBe(TIMESTAMPS[1]);
    expect(getNextTimestamp(TIMESTAMPS, TIMESTAMPS[2])).toBe(TIMESTAMPS[3]);
    expect(TIMESTAMPS).toEqual(snapshot);
  });

  it('wraps previous and next navigation circularly', () => {
    expect(getPreviousTimestamp(TIMESTAMPS, TIMESTAMPS[0])).toBe(TIMESTAMPS[5]);
    expect(getNextTimestamp(TIMESTAMPS, TIMESTAMPS[5])).toBe(TIMESTAMPS[0]);
  });

  it('returns null when circular navigation has no valid origin', () => {
    // quality: allow-negation-only (null is the explicit invalid-origin return contract)
    expect(getPreviousTimestamp(TIMESTAMPS, '2026-01-15T18:00:00Z')).toBeNull();
    expect(getNextTimestamp([], TIMESTAMPS[0])).toBeNull();
  });
});
