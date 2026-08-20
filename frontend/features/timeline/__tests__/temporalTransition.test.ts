import type { DemoTimestamp } from '@/features/airports';

import {
  createTemporalTransitionRunner,
  type TemporalTransition,
} from '../temporalTransition';
import {
  TEMPORAL_ENTER_DURATION_MS,
  TEMPORAL_EXIT_DURATION_MS,
} from '../timelineUtils';


const TARGET: DemoTimestamp = '2026-01-15T09:00:00Z';

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('TemporalTransitionRunner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('commits exactly once between exit and entry', async () => {
    const transitions: TemporalTransition[] = [];
    const commit = jest.fn();
    const runner = createTemporalTransitionRunner({
      onTransition: (transition) => transitions.push(transition),
    });

    const completed = runner.run(TARGET, commit);
    expect(transitions.map(({ phase }) => phase)).toEqual(['exiting']);

    jest.advanceTimersByTime(TEMPORAL_EXIT_DURATION_MS);
    await flushMicrotasks();
    expect(commit).toHaveBeenCalledTimes(1);
    expect(transitions.map(({ phase }) => phase)).toEqual([
      'exiting',
      'committing',
      'entering',
    ]);

    jest.advanceTimersByTime(TEMPORAL_ENTER_DURATION_MS);
    await expect(completed).resolves.toBe(true);
    expect(transitions.at(-1)).toEqual({ phase: 'idle', targetTimestamp: null });
  });

  it('removes decorative waits when reduced motion is preferred', async () => {
    const phases: string[] = [];
    const runner = createTemporalTransitionRunner({
      onTransition: ({ phase }) => phases.push(phase),
    });

    await expect(runner.run(TARGET, jest.fn(), { reducedMotion: true })).resolves.toBe(true);

    expect(phases).toEqual(['exiting', 'committing', 'entering', 'idle']);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels a stale target before its commit and completes the replacement', async () => {
    const firstCommit = jest.fn();
    const secondCommit = jest.fn();
    const runner = createTemporalTransitionRunner({ onTransition: jest.fn() });

    const first = runner.run(TARGET, firstCommit);
    const second = runner.run('2026-01-15T12:00:00Z', secondCommit, {
      reducedMotion: true,
    });

    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    expect(firstCommit).not.toHaveBeenCalled();
    expect(secondCommit).toHaveBeenCalledTimes(1);
  });

  it('returns to idle and exposes a failed atomic commit', async () => {
    const transitions: TemporalTransition[] = [];
    const runner = createTemporalTransitionRunner({
      onTransition: (transition) => transitions.push(transition),
    });

    await expect(runner.run(TARGET, async () => {
      throw new Error('commit failed');
    }, { reducedMotion: true })).rejects.toThrow('commit failed');

    expect(transitions.at(-1)).toEqual({ phase: 'idle', targetTimestamp: null });
    expect(transitions.some(({ phase }) => phase === 'entering')).toBe(false);
  });

  it('destroy clears timers and prevents later commits', async () => {
    const commit = jest.fn();
    const runner = createTemporalTransitionRunner({ onTransition: jest.fn() });
    const running = runner.run(TARGET, commit);

    runner.destroy();
    await expect(running).resolves.toBe(false);
    await expect(runner.run(TARGET, commit)).resolves.toBe(false);

    expect(commit).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
