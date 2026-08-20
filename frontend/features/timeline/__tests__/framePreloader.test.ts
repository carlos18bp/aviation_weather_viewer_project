import {
  createFramePreloader,
  getAdaptiveFrameRetentionPlan,
} from '../framePreloader';

function abortableLoader(key: string, aborted: string[]) {
  return (signal: AbortSignal): Promise<string> => new Promise((_, reject) => {
    signal.addEventListener('abort', () => {
      aborted.push(key);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

describe('FramePreloader', () => {
  it('caches resolved frames without running the loader twice', async () => {
    const preloader = createFramePreloader<string, string>();
    const loader = jest.fn(async () => 'frame-00');

    await expect(preloader.get('00Z', loader)).resolves.toBe('frame-00');
    await expect(preloader.get('00Z', loader)).resolves.toBe('frame-00');

    expect(loader).toHaveBeenCalledTimes(1);
    expect(preloader.size).toBe(1);
  });

  it('deduplicates concurrent requests for the same frame', async () => {
    const preloader = createFramePreloader<string, string>();
    let resolveFrame!: (value: string) => void;
    const loader = jest.fn(() => new Promise<string>((resolve) => {
      resolveFrame = resolve;
    }));

    const first = preloader.get('03Z', loader);
    const second = preloader.get('03Z', loader);
    expect(second).toBe(first);

    resolveFrame('frame-03');
    await expect(Promise.all([first, second])).resolves.toEqual(['frame-03', 'frame-03']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('promotes and reuses an in-flight preload when the frame is requested', async () => {
    const preloader = createFramePreloader<string, string>();
    let resolveFrame!: (value: string) => void;
    const preloadLoader = jest.fn(() => new Promise<string>((resolve) => {
      resolveFrame = resolve;
    }));
    const requestedLoader = jest.fn(async () => 'duplicate');

    const background = preloader.preload('06Z', preloadLoader);
    const requested = preloader.get('06Z', requestedLoader);
    resolveFrame('preloaded-frame');

    await background;
    await expect(requested).resolves.toBe('preloaded-frame');
    expect(preloadLoader).toHaveBeenCalledTimes(1);
    expect(requestedLoader).not.toHaveBeenCalled();
  });

  it('retains only active and adjacent keys and aborts stale work', async () => {
    const preloader = createFramePreloader<string, string>();
    const aborted: string[] = [];

    const stale = preloader.preload('00Z', abortableLoader('00Z', aborted));
    void preloader.preload('03Z', abortableLoader('03Z', aborted));
    void preloader.preload('06Z', abortableLoader('06Z', aborted));
    preloader.retain(['03Z', '06Z', '09Z']);

    await stale;
    expect(aborted).toEqual(['00Z']);
    expect(preloader.size).toBe(2);
    preloader.clear();
  });

  it('never stores more than three frame keys', async () => {
    const preloader = createFramePreloader<string, string>();
    const loader = async (signal: AbortSignal) => signal.aborted ? 'aborted' : 'ready';

    await preloader.get('00Z', loader);
    await preloader.get('03Z', loader);
    await preloader.get('06Z', loader);
    await preloader.get('09Z', loader);

    expect(preloader.size).toBe(3);
  });

  it('evicts a failed preload so a foreground request can retry normally', async () => {
    const preloader = createFramePreloader<string, string>();
    const failedLoader = jest.fn(async () => {
      throw new Error('background failure');
    });
    const requestedLoader = jest.fn(async () => 'fresh-frame');

    await expect(preloader.preload('12Z', failedLoader)).resolves.toBeUndefined();
    await expect(preloader.get('12Z', requestedLoader)).resolves.toBe('fresh-frame');

    expect(failedLoader).toHaveBeenCalledTimes(1);
    expect(requestedLoader).toHaveBeenCalledTimes(1);
  });

  it('prioritizes a requested frame when the cache is full of preloads', async () => {
    const preloader = createFramePreloader<string, string>();
    const aborted: string[] = [];

    void preloader.preload('00Z', abortableLoader('00Z', aborted));
    void preloader.preload('03Z', abortableLoader('03Z', aborted));
    void preloader.preload('06Z', abortableLoader('06Z', aborted));
    await expect(preloader.get('09Z', async () => 'requested')).resolves.toBe('requested');

    expect(aborted).toEqual(['00Z']);
    expect(preloader.size).toBe(3);
    preloader.clear();
  });

  it('uses least-recently-used eviction for equally prioritized frames', async () => {
    const preloader = createFramePreloader<string, string>();
    const fallback = jest.fn(async () => 'reloaded');

    await preloader.get('00Z', async () => '00');
    await preloader.get('03Z', async () => '03');
    await preloader.get('06Z', async () => '06');
    await preloader.get('00Z', async () => 'unused');
    await preloader.get('09Z', async () => '09');
    await expect(preloader.get('03Z', fallback)).resolves.toBe('reloaded');

    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('clear aborts every pending frame and is idempotent', async () => {
    const preloader = createFramePreloader<string, string>();
    const aborted: string[] = [];
    const first = preloader.preload('12Z', abortableLoader('12Z', aborted));
    const second = preloader.preload('15Z', abortableLoader('15Z', aborted));

    preloader.clear();
    preloader.clear();
    await Promise.all([first, second]);

    expect(aborted).toEqual(['12Z', '15Z']);
    expect(preloader.size).toBe(0);
  });

  it('plans exact circular retention for phone, tablet, desktop, and degraded', () => {
    const window = { previous: '03Z', active: '06Z', next: '09Z' };

    expect(getAdaptiveFrameRetentionPlan('phone', window)).toEqual({
      retainedKeys: ['06Z', '09Z'],
      preloadKeys: ['09Z'],
    });
    expect(getAdaptiveFrameRetentionPlan('tablet', window)).toEqual({
      retainedKeys: ['06Z', '03Z', '09Z'],
      preloadKeys: ['03Z', '09Z'],
    });
    expect(getAdaptiveFrameRetentionPlan('desktop', window)).toEqual({
      retainedKeys: ['06Z', '03Z', '09Z'],
      preloadKeys: ['03Z', '09Z'],
    });
    expect(getAdaptiveFrameRetentionPlan('degraded', window)).toEqual({
      retainedKeys: ['06Z'],
      preloadKeys: [],
    });
  });

  it('applies the phone limit and aborts both excess requests', async () => {
    const preloader = createFramePreloader<string, string>();
    const aborted: string[] = [];
    const first = preloader.preload('00Z', abortableLoader('00Z', aborted));
    const second = preloader.preload('03Z', abortableLoader('03Z', aborted));
    void preloader.preload('06Z', abortableLoader('06Z', aborted));

    preloader.retain(['06Z', '09Z'], 2);
    await Promise.all([first, second]);

    expect(aborted).toEqual(['00Z', '03Z']);
    expect(preloader.size).toBe(1);
    preloader.clear();
  });

  it('applies degraded retention and aborts adjacent requests', async () => {
    const preloader = createFramePreloader<string, string>();
    const aborted: string[] = [];
    void preloader.preload('06Z', abortableLoader('06Z', aborted));
    const previous = preloader.preload('03Z', abortableLoader('03Z', aborted));
    const next = preloader.preload('09Z', abortableLoader('09Z', aborted));

    preloader.retain(['06Z'], 1);
    await Promise.all([previous, next]);

    expect(aborted).toEqual(['03Z', '09Z']);
    expect(preloader.size).toBe(1);
    preloader.clear();
  });

  it('does not start a background request outside the retained profile window', async () => {
    const preloader = createFramePreloader<string, string>();
    const loader = jest.fn(async () => 'stale');
    preloader.retain(['06Z'], 1);

    await preloader.preload('09Z', loader);

    expect(loader).not.toHaveBeenCalled();
    expect(preloader.size).toBe(0);
  });

  it('never evicts a visible requested frame for an extra preload', async () => {
    const preloader = createFramePreloader<string, string>();
    const preloadLoader = jest.fn(async () => 'adjacent');
    preloader.retain(['06Z'], 1);
    await preloader.get('06Z', async () => 'visible');

    await preloader.preload('09Z', preloadLoader);

    expect(preloadLoader).not.toHaveBeenCalled();
    await expect(preloader.get('06Z', async () => 'replacement')).resolves.toBe('visible');
  });
});
