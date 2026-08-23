import {
  detectInstallPlatform,
  isStandaloneDisplay,
  type InstallPlatform,
} from './installEnvironment';
import {
  hasAutoOpenedModal,
  markAutoOpenedModal,
  readInstalledFlag,
  writeInstalledFlag,
} from './installPreferences';
import {
  APP_INSTALLED_EVENT,
  INSTALL_PROMPT_EVENT,
  INSTALL_PROMPT_GLOBAL,
} from './installPromptCapture';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void> | void;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PromptOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface PwaState {
  /** A native install prompt is held and can be shown. */
  canPrompt: boolean;
  isInstalled: boolean;
  platform: InstallPlatform;
  isModalOpen: boolean;
  updateAvailable: boolean;
}

/** How long after the map settles the explanatory modal opens by itself, once. */
export const AUTO_OPEN_DELAY_MS = 8000;

const SERVER_STATE: PwaState = {
  canPrompt: false,
  isInstalled: false,
  platform: 'unknown',
  isModalOpen: false,
  updateAvailable: false,
};

let state: PwaState = SERVER_STATE;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
let installedThisSession = false;

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function patch(next: Partial<PwaState>): void {
  const merged = { ...state, ...next };
  const changed = (Object.keys(merged) as (keyof PwaState)[]).some(
    (key) => merged[key] !== state[key],
  );

  if (!changed) {
    return;
  }

  state = merged;
  emit();
}

function adoptDeferredPrompt(event: BeforeInstallPromptEvent | null): void {
  deferredPrompt = event;
  patch({ canPrompt: event !== null });
}

function readCapturedPrompt(): BeforeInstallPromptEvent | null {
  const captured = (window as unknown as Record<string, unknown>)[INSTALL_PROMPT_GLOBAL];
  return (captured as BeforeInstallPromptEvent | undefined) ?? null;
}

/**
 * isInstalled is derived from live evidence only. The persisted flag never
 * suppresses the install UI on its own: the reference implementation does that
 * and the entry point disappears forever once the user uninstalls.
 */
function refreshInstalledState(): void {
  const standalone = isStandaloneDisplay();

  if (standalone) {
    writeInstalledFlag(true, new Date().toISOString());
  }

  patch({ isInstalled: standalone || installedThisSession });
}

function handleNativePrompt(event: Event): void {
  event.preventDefault();
  adoptDeferredPrompt(event as BeforeInstallPromptEvent);
}

function handleCapturedPrompt(): void {
  adoptDeferredPrompt(readCapturedPrompt());
}

function handleInstalled(): void {
  deferredPrompt = null;
  installedThisSession = true;
  writeInstalledFlag(true, new Date().toISOString());
  patch({ canPrompt: false, isInstalled: true, isModalOpen: false });
}

function handleVisibilityChange(): void {
  if (!document.hidden) {
    refreshInstalledState();
  }
}

/** Idempotent; the listeners live for the page's lifetime by design. */
export function initializePwaStore(): void {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;

  patch({ platform: detectInstallPlatform() });
  refreshInstalledState();
  adoptDeferredPrompt(readCapturedPrompt());

  window.addEventListener(INSTALL_PROMPT_EVENT, handleCapturedPrompt);
  window.addEventListener(APP_INSTALLED_EVENT, handleInstalled);
  // Also bound natively so the store works without the inline capture script.
  window.addEventListener('beforeinstallprompt', handleNativePrompt);
  window.addEventListener('appinstalled', handleInstalled);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

export function subscribe(listener: () => void): () => void {
  initializePwaStore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): PwaState {
  return state;
}

export function getServerSnapshot(): PwaState {
  return SERVER_STATE;
}

export function openModal(): void {
  patch({ isModalOpen: true });
}

export function closeModal(): void {
  patch({ isModalOpen: false });
}

/**
 * Opens the explanatory modal by itself, at most once per device. Anyone who
 * already had the app installed is never nagged, even after uninstalling.
 */
export function autoOpenModalOnce(): boolean {
  if (state.isInstalled || state.isModalOpen || hasAutoOpenedModal() || readInstalledFlag()) {
    return false;
  }

  markAutoOpenedModal();
  openModal();
  return true;
}

export async function promptInstall(): Promise<PromptOutcome> {
  const prompt = deferredPrompt;

  if (!prompt) {
    return 'unavailable';
  }

  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    adoptDeferredPrompt(null);

    if (outcome === 'accepted') {
      handleInstalled();
    }

    return outcome;
  } catch {
    // A refused or already-consumed prompt leaves the manual steps as the path.
    adoptDeferredPrompt(null);
    return 'unavailable';
  }
}

export function setUpdateAvailable(updateAvailable: boolean): void {
  patch({ updateAvailable });
}

let serviceWorkerHandle: { applyUpdate(): void } | null = null;

export function setServiceWorkerHandle(handle: { applyUpdate(): void } | null): void {
  serviceWorkerHandle = handle;
}

export function applyServiceWorkerUpdate(): void {
  serviceWorkerHandle?.applyUpdate();
  patch({ updateAvailable: false });
}
