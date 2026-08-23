const ORIGIN = 'https://aviation.test';

type Route = 'navigation' | 'next-static' | 'map' | 'scene' | 'api' | 'shell' | 'bypass';

interface RequestInitLike {
  method?: string;
  mode?: string;
  rsc?: boolean;
}

let routeFor: (request: unknown, url: URL) => Route;
let originalSelf: PropertyDescriptor | undefined;

function requestFor(path: string, init: RequestInitLike = {}) {
  return {
    method: init.method ?? 'GET',
    mode: init.mode ?? 'cors',
    headers: { has: (name: string) => Boolean(init.rsc) && name === 'RSC' },
  };
}

function route(path: string, init: RequestInitLike = {}): Route {
  return routeFor(requestFor(path, init), new URL(path, ORIGIN));
}

beforeAll(() => {
  originalSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  const fakeSelf: Record<string, unknown> = {
    location: { origin: ORIGIN },
    addEventListener: jest.fn(),
    registration: {},
    clients: { claim: jest.fn() },
  };
  Object.defineProperty(globalThis, 'self', { value: fakeSelf, configurable: true, writable: true });

  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../../public/sw.js');
  });

  routeFor = fakeSelf.__swRouteFor as typeof routeFor;
});

afterAll(() => {
  if (originalSelf) {
    Object.defineProperty(globalThis, 'self', originalSelf);
  }
});

describe('cached request classes', () => {
  it('routes the document through the navigation strategy', () => {
    expect(route('/', { mode: 'navigate' })).toBe('navigation');
  });

  it('routes content-hashed bundles and frozen basemap assets to their own buckets', () => {
    expect(route('/_next/static/chunks/3l04zcqx63h3y.js')).toBe('next-static');
    expect(route('/map/style.json')).toBe('map');
    expect(route('/map/data/colombia-departments.geojson')).toBe('map');
  });

  it('keeps the percent-encoded glyph path inside the basemap bucket', () => {
    expect(route('/map/fonts/Noto%20Sans%20Regular/0-255.pbf')).toBe('map');
  });

  it('routes the scene payloads that actually hold the weather data', () => {
    expect(route('/media/demo-weather/demo-colombia-001/wind/06Z.json')).toBe('scene');
    expect(route('/media/demo-weather/demo-colombia-001/temperature/06Z.webp')).toBe('scene');
  });

  it('routes the metadata endpoints separately from their payloads', () => {
    expect(route('/api/v1/demo/weather/catalog')).toBe('api');
    expect(route('/api/v1/airports')).toBe('api');
  });

  it('routes the installable assets to the shell bucket', () => {
    expect(route('/manifest.webmanifest')).toBe('shell');
    expect(route('/icons/icon-512.png')).toBe('shell');
  });
});

describe('requests the worker must not touch', () => {
  it('never intercepts a mutation', () => {
    expect(route('/api/v1/demo/weather/catalog', { method: 'POST' })).toBe('bypass');
  });

  it('never intercepts a flight request for the document', () => {
    expect(route('/', { mode: 'navigate', rsc: true })).toBe('bypass');
  });

  it('never intercepts another origin', () => {
    const external = new URL('https://tiles.example.com/1/2/3.png');
    expect(routeFor(requestFor('/x'), external)).toBe('bypass');
  });

  it('leaves unclaimed media and internal Next endpoints alone', () => {
    expect(route('/media/other/thing.png')).toBe('bypass');
    expect(route('/_next/image?url=x')).toBe('bypass');
  });
});
