import manifest from '@/app/manifest';

const declared = manifest();

it('declares the frozen product identity', () => {
  expect(declared.name).toBe('Meteorología Aeronáutica · Demo ProjectApp');
  expect(declared.short_name).toBe('Meteo Aero');
  expect(declared.lang).toBe('es');
});

it('launches standalone from the viewer root', () => {
  expect(declared.start_url).toBe('/');
  expect(declared.scope).toBe('/');
  expect(declared.display).toBe('standalone');
});

it('leaves orientation free because the viewer supports both', () => {
  expect(declared.orientation).toBeUndefined();
});

it('ships the icon sizes Chromium requires to offer installation', () => {
  const sizes = (declared.icons ?? []).map((icon) => `${icon.sizes}:${icon.purpose}`);

  expect(sizes).toContain('192x192:any');
  expect(sizes).toContain('512x512:any');
  expect(sizes).toContain('512x512:maskable');
});

it('paints the install splash with the frozen viewer background', () => {
  expect(declared.background_color).toBe('#06111c');
  expect(declared.theme_color).toBe('#06111c');
});
