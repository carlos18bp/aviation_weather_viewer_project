/** Where the viewer is running, as far as "can this be installed" is concerned. */
export type InstallPlatform =
  | 'chromium'
  /** iOS Safari: no beforeinstallprompt, but Add to Home Screen works. */
  | 'ios-safari'
  /** Chrome/Firefox/Edge on iOS: cannot install at all, must switch to Safari. */
  | 'ios-other'
  | 'firefox'
  | 'safari'
  | 'in-app-webview'
  | 'unknown';

const STANDALONE_QUERIES = [
  '(display-mode: standalone)',
  '(display-mode: fullscreen)',
  '(display-mode: minimal-ui)',
  '(display-mode: window-controls-overlay)',
];

/** Browsers embedded inside another app cannot install anything. */
const IN_APP_WEBVIEW_TOKENS = [
  'fban',
  'fbav',
  'fb_iab',
  'instagram',
  'line/',
  'micromessenger',
  'wechat',
  'whatsapp',
  'tiktok',
];

interface IosNavigator extends Navigator {
  standalone?: boolean;
}

/** True once the viewer runs from the home screen instead of a browser tab. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if ((window.navigator as IosNavigator).standalone === true) {
    return true;
  }

  // Trusted Web Activity on Android.
  if (typeof document !== 'undefined' && document.referrer.startsWith('android-app://')) {
    return true;
  }

  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return STANDALONE_QUERIES.some((query) => window.matchMedia(query).matches);
}

function isIos(userAgent: string, maxTouchPoints: number): boolean {
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return true;
  }

  // iPadOS 13+ reports a desktop Macintosh user agent; touch points give it away.
  return userAgent.includes('macintosh') && maxTouchPoints > 1;
}

export function detectInstallPlatform(
  userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints: number = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
): InstallPlatform {
  const agent = userAgent.toLowerCase();

  if (IN_APP_WEBVIEW_TOKENS.some((token) => agent.includes(token))) {
    return 'in-app-webview';
  }

  if (isIos(agent, maxTouchPoints)) {
    return /crios|fxios|edgios|opt\//.test(agent) ? 'ios-other' : 'ios-safari';
  }

  if (agent.includes('firefox')) {
    return 'firefox';
  }

  if (agent.includes('edg/') || agent.includes('chrome') || agent.includes('chromium')) {
    return 'chromium';
  }

  if (agent.includes('safari')) {
    return 'safari';
  }

  return 'unknown';
}
