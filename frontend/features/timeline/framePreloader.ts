const MAX_RETAINED_FRAMES = 3;

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
  retain(keys: readonly TKey[]): void;
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

  get size(): number {
    return this.entries.size;
  }

  get(key: TKey, loader: Loader<TValue>): Promise<TValue> {
    return this.load(key, loader, 'requested');
  }

  async preload(key: TKey, loader: Loader<TValue>): Promise<void> {
    try {
      await this.load(key, loader, 'preload');
    } catch {
      // Background failures are intentionally invisible and are evicted by load().
    }
  }

  retain(keys: readonly TKey[]): void {
    const retained = new Set<TKey>();
    for (const key of keys) {
      if (retained.size === MAX_RETAINED_FRAMES) {
        break;
      }
      retained.add(key);
    }

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

    this.evictForInsertion(priority);
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

  private evictForInsertion(priority: FrameRequestPriority): void {
    if (this.entries.size < MAX_RETAINED_FRAMES) {
      return;
    }

    const candidates = [...this.entries.entries()];
    const preferred = priority === 'requested'
      ? candidates.filter(([, entry]) => entry.priority === 'preload')
      : candidates;
    const pool = preferred.length > 0 ? preferred : candidates;
    const [key, entry] = pool.reduce((oldest, candidate) => (
      candidate[1].lastAccess < oldest[1].lastAccess ? candidate : oldest
    ));
    entry.controller.abort();
    this.entries.delete(key);
  }
}

export function createFramePreloader<TKey, TValue>(): ManagedFramePreloader<TKey, TValue> {
  return new BoundedFramePreloader<TKey, TValue>();
}
