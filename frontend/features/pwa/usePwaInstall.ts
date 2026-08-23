'use client';

import { useSyncExternalStore } from 'react';

import { getServerSnapshot, getSnapshot, subscribe, type PwaState } from './pwaStore';

export function usePwaState(): PwaState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
