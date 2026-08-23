import type * as PwaStoreModule from '../pwaStore';

type PwaStore = typeof PwaStoreModule;

interface FakePromptEvent extends Event {
  prompt: jest.Mock;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function fakePrompt(outcome: 'accepted' | 'dismissed'): FakePromptEvent {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as FakePromptEvent;
  event.prompt = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(event, 'userChoice', { value: Promise.resolve({ outcome }) });
  return event;
}

function mockStandalone(standalone: boolean): void {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: standalone && query === '(display-mode: standalone)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

/** The store is a module singleton, so every case needs a fresh module graph. */
async function loadStore(): Promise<PwaStore> {
  jest.resetModules();
  const store = await import('../pwaStore');
  store.initializePwaStore();
  return store;
}

beforeEach(() => {
  window.localStorage.clear();
  mockStandalone(false);
  delete (window as unknown as Record<string, unknown>).__aeroInstallPrompt;
});

describe('install prompt capture', () => {
  it('adopts a prompt the inline script parked before the store initialised', async () => {
    (window as unknown as Record<string, unknown>).__aeroInstallPrompt = fakePrompt('accepted');
    const store = await loadStore();

    expect(store.getSnapshot().canPrompt).toBe(true);
  });

  it('adopts a prompt that arrives after initialisation', async () => {
    const store = await loadStore();
    expect(store.getSnapshot().canPrompt).toBe(false);

    window.dispatchEvent(fakePrompt('accepted'));

    expect(store.getSnapshot().canPrompt).toBe(true);
  });
});

describe('promptInstall', () => {
  it('marks the app installed when the user accepts and closes the modal', async () => {
    const store = await loadStore();
    const event = fakePrompt('accepted');
    window.dispatchEvent(event);
    store.openModal();

    await expect(store.promptInstall()).resolves.toBe('accepted');

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().isInstalled).toBe(true);
    expect(store.getSnapshot().isModalOpen).toBe(false);
  });

  it('consumes the prompt without installing when the user dismisses it', async () => {
    const store = await loadStore();
    window.dispatchEvent(fakePrompt('dismissed'));

    await expect(store.promptInstall()).resolves.toBe('dismissed');

    expect(store.getSnapshot().isInstalled).toBe(false);
    expect(store.getSnapshot().canPrompt).toBe(false);
  });

  it('reports unavailable when no native prompt was ever captured', async () => {
    const store = await loadStore();

    await expect(store.promptInstall()).resolves.toBe('unavailable');
  });
});

describe('installed state', () => {
  it('derives installation from standalone display rather than stored history', async () => {
    mockStandalone(true);
    const store = await loadStore();

    expect(store.getSnapshot().isInstalled).toBe(true);
  });

  it('shows the install entry again for a stored flag with no standalone evidence', async () => {
    mockStandalone(true);
    await loadStore();
    mockStandalone(false);
    const reopened = await loadStore();

    expect(reopened.getSnapshot().isInstalled).toBe(false);
  });

  it('reacts to the appinstalled event', async () => {
    const store = await loadStore();

    window.dispatchEvent(new Event('appinstalled'));

    expect(store.getSnapshot().isInstalled).toBe(true);
  });
});

describe('autoOpenModalOnce', () => {
  it('opens the modal once and never again on the same device', async () => {
    const store = await loadStore();

    expect(store.autoOpenModalOnce()).toBe(true);
    expect(store.getSnapshot().isModalOpen).toBe(true);

    store.closeModal();

    expect(store.autoOpenModalOnce()).toBe(false);
    expect(store.getSnapshot().isModalOpen).toBe(false);
  });

  it('never nags someone who already has the app installed', async () => {
    mockStandalone(true);
    const store = await loadStore();

    expect(store.autoOpenModalOnce()).toBe(false);
  });
});
