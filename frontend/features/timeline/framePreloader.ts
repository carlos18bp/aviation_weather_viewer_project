import type { WindRenderProfileId } from '@/features/performance';

const MAX_RETAINED_FRAMES = 3;

export type FrameRetentionLimit = 1 | 2 | 3;

export interface AdaptiveFrameWindow<TKey> {
  previous: TKey;
  active: TKey;
  next: TKey;
}

export interface AdaptiveFrameRetentionPlan<TKey> {
  retainedKeys: readonly TKey[];
  preloadKeys: readonly TKey[];
}

type Loader<TValue> = (signal: AbortSignal) => Promise<TValue>;
type FrameRequestPriority = 'preload' | 'requested';

interface CacheEntry<TValue> {
  controller: AbortController;
  promise: Promise<TValue>;
  priority: FrameRequestPriority;
  lastAccess: number;
}

export interface FramePreloader<TKey, TValue> {
  get(key: TKey, loader: Loader<TValue>): Promise<TValue>;
  retain(keys: readonly TKey[], limit?: FrameRetentionLimit): void;
  clear(): void;
}

export interface ManagedFramePreloader<TKey, TValue>
  extends FramePreloader<TKey, TValue> {
  readonly size: number;
  preload(key: TKey, loader: Loader<TValue>): Promise<void>;
}

class BoundedFramePreloader<TKey, TValue>
implements ManagedFramePreloader<TKey, TValue> {
  private readonly entries = new Map<TKey, CacheEntry<TValue>>();
  private accessSequence = 0;
  private retentionLimit: FrameRetentionLimit = MAX_RETAINED_FRAMES;
  private retainedKeys: Set<TKey> | null = null;

  get size(): number {
    return this.entries.size;
  }

  get(key: TKey, loader: Loader<TValue>): Promise<TValue> {
    return this.load(key, loader, 'requested');
  }

  async preload(key: TKey, loader: Loader<TValue>): Promise<void> {
    if (this.retainedKeys && !this.retainedKeys.has(key)) {
      return;
    }
    try {
      await this.load(key, loader, 'preload');
    } catch {
      // Background failures are intentionally invisible and are evicted by load().
    }
  }

  retain(
    keys: readonly TKey[],
    limit: FrameRetentionLimit = MAX_RETAINED_FRAMES,
  ): void {
    this.retentionLimit = limit;
    const retained = new Set<TKey>();
    for (const key of keys) {
      if (retained.size === limit) {
        break;
      }
      retained.add(key);
    }
    this.retainedKeys = retained;

    for (const [key, entry] of this.entries) {
      if (!retained.has(key)) {
        entry.controller.abort();
        this.entries.delete(key);
      }
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) {
      entry.controller.abort();
    }
    this.entries.clear();
  }

  private load(
    key: TKey,
    loader: Loader<TValue>,
    priority: FrameRequestPriority,
  ): Promise<TValue> {
    const cached = this.entries.get(key);
    if (cached) {
      cached.lastAccess = ++this.accessSequence;
      if (priority === 'requested') {
        cached.priority = 'requested';
      }
      return cached.promise;
    }

    if (priority === 'requested') {
      this.admitRequestedKey(key);
    }
    if (!this.evictForInsertion(priority)) {
      return Promise.reject(new DOMException('Preload capacity reached.', 'AbortError'));
    }
    const controller = new AbortController();
    let promise: Promise<TValue>;
    try {
      promise = loader(controller.signal);
    } catch (error) {
      promise = Promise.reject(error);
    }

    const entry: CacheEntry<TValue> = {
      controller,
      promise,
      priority,
      lastAccess: ++this.accessSequence,
    };
    this.entries.set(key, entry);

    void promise.then(
      () => undefined,
      () => {
        if (this.entries.get(key) === entry) {
          this.entries.delete(key);
        }
      },
    );
    return promise;
  }

  private admitRequestedKey(key: TKey): void {
    if (!this.retainedKeys || this.retainedKeys.has(key)) {
      return;
    }

    const retained = [key, ...this.retainedKeys];
    this.retainedKeys = new Set(retained.slice(0, this.retentionLimit));
  }

  private evictForInsertion(priority: FrameRequestPriority): boolean {
    if (this.entries.size < this.retentionLimit) {
      return true;
    }

    const candidates = [...this.entries.entries()];
    const preloadCandidates = candidates.filter(
      ([, entry]) => entry.priority === 'preload',
    );
    const pool = preloadCandidates.length > 0
      ? preloadCandidates
      : priority === 'requested' ? candidates : [];
    if (pool.length === 0) {
      return false;
    }
    const [key, entry] = pool.reduce((oldest, candidate) => (
      candidate[1].lastAccess < oldest[1].lastAccess ? candidate : oldest
    ));
    entry.controller.abort();
    this.entries.delete(key);
    return true;
  }
}

export function getAdaptiveFrameRetentionPlan<TKey>(
  profileId: WindRenderProfileId,
  frameWindow: AdaptiveFrameWindow<TKey>,
): AdaptiveFrameRetentionPlan<TKey> {
  switch (profileId) {
    case 'degraded':
      return {
        retainedKeys: [frameWindow.active],
        preloadKeys: [],
      };
    case 'phone':
      return {
        retainedKeys: [frameWindow.active, frameWindow.next],
        preloadKeys: [frameWindow.next],
      };
    case 'tablet':
    case 'desktop':
      return {
        retainedKeys: [frameWindow.active, frameWindow.previous, frameWindow.next],
        preloadKeys: [frameWindow.previous, frameWindow.next],
      };
  }
}

export function createFramePreloader<TKey, TValue>(): ManagedFramePreloader<TKey, TValue> {
  return new BoundedFramePreloader<TKey, TValue>();
}
