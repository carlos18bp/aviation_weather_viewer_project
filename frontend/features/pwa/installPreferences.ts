/**
 * The only persisted state the PWA feature owns. Kept out of the Zustand viewer
 * store on purpose: that store's reset() semantics are contract-tested, and this
 * outlives a reset by design.
 */
const AUTO_SHOWN_KEY = 'aero-pwa-auto-shown';
const INSTALLED_KEY = 'aero-pwa-installed';

function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private mode and blocked storage must not break the viewer.
    return null;
  }
}

function writeKey(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignored on purpose: persistence is a nicety, not a requirement.
  }
}

function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignored on purpose.
  }
}

export function hasAutoOpenedModal(): boolean {
  return readKey(AUTO_SHOWN_KEY) === 'true';
}

export function markAutoOpenedModal(): void {
  writeKey(AUTO_SHOWN_KEY, 'true');
}

export function readInstalledFlag(): boolean {
  return readKey(INSTALLED_KEY) !== null;
}

/**
 * Unlike the reference implementation this flag is clearable: leaving it set
 * forever hides the install UI on that profile even after the user uninstalls.
 */
export function writeInstalledFlag(installed: boolean, now: string): void {
  if (installed) {
    writeKey(INSTALLED_KEY, now);
    return;
  }

  removeKey(INSTALLED_KEY);
}
