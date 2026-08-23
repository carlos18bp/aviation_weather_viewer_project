import { detectInstallPlatform, isStandaloneDisplay } from '../installEnvironment';

const CHROME_DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const EDGE = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0';
const SAFARI_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1';
const IPAD_OS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 300.0.0.0';

function mockDisplayMode(matching: string | null): void {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query === matching,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

describe('detectInstallPlatform', () => {
  it('recognises the desktop browsers that expose a native install path', () => {
    expect(detectInstallPlatform(CHROME_DESKTOP, 0)).toBe('chromium');
    expect(detectInstallPlatform(EDGE, 0)).toBe('chromium');
    expect(detectInstallPlatform(FIREFOX, 0)).toBe('firefox');
    expect(detectInstallPlatform(SAFARI_DESKTOP, 0)).toBe('safari');
  });

  it('separates iOS Safari from the iOS browsers that cannot install', () => {
    expect(detectInstallPlatform(IPHONE_SAFARI, 5)).toBe('ios-safari');
    expect(detectInstallPlatform(IPHONE_CHROME, 5)).toBe('ios-other');
  });

  it('treats a touch-capable Macintosh user agent as iPadOS', () => {
    expect(detectInstallPlatform(IPAD_OS, 5)).toBe('ios-safari');
    expect(detectInstallPlatform(IPAD_OS, 0)).toBe('safari');
  });

  it('flags embedded webviews ahead of the platform they pretend to be', () => {
    expect(detectInstallPlatform(INSTAGRAM, 5)).toBe('in-app-webview');
  });
});

describe('isStandaloneDisplay', () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true });
  });

  it('is false while the viewer runs in a normal browser tab', () => {
    mockDisplayMode(null);
    expect(isStandaloneDisplay()).toBe(false);
  });

  it('is true for every installed display mode', () => {
    mockDisplayMode('(display-mode: standalone)');
    expect(isStandaloneDisplay()).toBe(true);
    mockDisplayMode('(display-mode: window-controls-overlay)');
    expect(isStandaloneDisplay()).toBe(true);
    mockDisplayMode('(display-mode: minimal-ui)');
    expect(isStandaloneDisplay()).toBe(true);
  });

  it('is true on iOS where only navigator.standalone reports it', () => {
    mockDisplayMode(null);
    Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });
    expect(isStandaloneDisplay()).toBe(true);
  });
});
