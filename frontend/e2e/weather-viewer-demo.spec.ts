import { expect, test } from '@playwright/test';

// Catches a false demo-ready state where the map renders but airport delegation,
// synchronized frames, playback, reset, deterministic reload, or same-origin assets regress.

const STAGING_HOSTNAME = 'aviation-weather-platform.projectapp.co';
const MAP_BOOTSTRAP_TIMEOUT_MS = 60_000;
const TIMESTAMPS = [
  '2026-01-15T00:00:00Z',
  '2026-01-15T03:00:00Z',
  '2026-01-15T06:00:00Z',
  '2026-01-15T09:00:00Z',
  '2026-01-15T12:00:00Z',
  '2026-01-15T15:00:00Z',
] as const;

function zuluHour(timestamp: string): string {
  return `${timestamp.slice(11, 13)}:00Z`;
}

function panelZuluHour(timestamp: string): string {
  return `${timestamp.slice(11, 13)}Z`;
}

function projectSkboClick(width: number, height: number): { x: number; y: number } {
  const mapCenter = { longitude: -73.5, latitude: 4.5 };
  const skbo = { longitude: -74.1469, latitude: 4.70159 };
  const regionalBounds = { west: -84, east: -64 };
  const pixelsPerDegree = width / (regionalBounds.east - regionalBounds.west);
  const worldSize = pixelsPerDegree * 360;
  const mercatorY = (latitude: number) => (
    (1 - Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) / Math.PI) / 2
  );

  return {
    x: ((skbo.longitude - regionalBounds.west) / (regionalBounds.east - regionalBounds.west)) * width,
    y: height / 2 + (mercatorY(skbo.latitude) - mercatorY(mapCenter.latitude)) * worldSize,
  };
}

test(
  'the public demo keeps its deterministic weather journey synchronized @flow:viewer-demo-journey @outcome:success @outcome:display',
  { tag: ['@flow:viewer-demo-journey', '@outcome:success', '@outcome:display'] },
  async ({ page }) => {
    test.slow();

    const requestedUrls: URL[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        requestedUrls.push(url);
      }
    });

    await page.goto('/');

    const viewer = page.locator('[data-weather-viewer]');
    await expect(page.getByText('Mapa local listo', { exact: true })).toHaveText('Mapa local listo', {
      timeout: MAP_BOOTSTRAP_TIMEOUT_MS,
    });
    await expect(page.getByText('DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL')).toHaveText(
      'DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL',
    );
    await expect(viewer).toHaveAttribute('data-active-layer', 'wind');
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T06:00:00Z');
    await expect(viewer).toHaveAttribute('data-frame-loading', 'false');

    const map = page.getByTestId('weather-map-container');
    await expect(map).toHaveAttribute('aria-label', 'Mapa meteorológico navegable de Colombia');
    const mapBox = await map.boundingBox();
    expect(mapBox).not.toBeNull();
    const skboClick = projectSkboClick(mapBox!.width, mapBox!.height);
    await map.click({ position: skboClick });

    const airportPanel = page.getByRole('region', { name: 'El Dorado International Airport' });
    await expect(airportPanel.getByText('SKBO', { exact: true })).toHaveText('SKBO');
    await expect(airportPanel.getByLabel('Datos simulados, no operacionales')).toHaveText('Datos simulados · No operacional');
    await expect(airportPanel.locator('time')).toHaveAttribute('dateTime', '2026-01-15T06:00:00Z');
    await expect(airportPanel).toContainText('Condición para 06Z');

    await page.getByRole('button', { name: /Temperatura/ }).click();
    await expect(viewer).toHaveAttribute('data-active-layer', 'temperature');
    await expect(page.getByRole('region', { name: 'Leyenda de Temperatura' })).toContainText('Temperatura');

    for (const timestamp of TIMESTAMPS) {
      const hour = zuluHour(timestamp);
      await page.getByRole('button', { name: `Seleccionar ${hour}` }).click();
      await expect(viewer).toHaveAttribute('data-active-timestamp', timestamp);
      await expect(airportPanel.locator('time')).toHaveAttribute('dateTime', timestamp);
      await expect(airportPanel.locator('time')).toHaveText(panelZuluHour(timestamp));
      await expect(page.getByRole('button', { name: `Seleccionar ${hour}` })).toHaveAttribute('aria-current', 'time');
    }

    await page.getByRole('button', { name: 'Timestamp anterior' }).click();
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T12:00:00Z');
    await expect(airportPanel.locator('time')).toHaveText('12Z');
    await page.getByRole('button', { name: 'Timestamp siguiente' }).click();
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T15:00:00Z');
    await expect(airportPanel.locator('time')).toHaveText('15Z');

    await page.getByRole('button', { name: 'Iniciar reproducción' }).click();
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T00:00:00Z');
    await expect(airportPanel.locator('time')).toHaveText('00Z');
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T03:00:00Z');
    await expect(airportPanel.locator('time')).toHaveText('03Z');
    await page.getByRole('button', { name: 'Pausar reproducción' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar reproducción' })).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', { name: /Viento/ }).click();
    await expect(viewer).toHaveAttribute('data-active-layer', 'wind');
    await expect(page.getByRole('region', { name: 'Leyenda de Viento' })).toContainText('Viento');

    await page.getByRole('button', { name: 'Reiniciar' }).click();
    await expect(viewer).toHaveAttribute('data-active-layer', 'wind');
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T06:00:00Z');
    await expect(page.getByRole('heading', { name: 'Selecciona un aeropuerto' })).toHaveText('Selecciona un aeropuerto');

    await page.reload();
    await expect(page.getByText('Mapa local listo', { exact: true })).toHaveText('Mapa local listo', {
      timeout: MAP_BOOTSTRAP_TIMEOUT_MS,
    });
    await expect(viewer).toHaveAttribute('data-active-layer', 'wind');
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T06:00:00Z');
    await expect(viewer).toHaveAttribute('data-frame-loading', 'false');

    const requestedHostnames = requestedUrls.map((url) => url.hostname);
    const requestedPaths = requestedUrls.map((url) => url.pathname);
    expect(requestedHostnames).toEqual(expect.arrayContaining([STAGING_HOSTNAME]));
    for (const hostname of requestedHostnames) {
      expect(hostname).toBe(STAGING_HOSTNAME);
    }
    expect(requestedPaths).toContain('/api/v1/demo/weather/frames');
    expect(requestedPaths).toContain('/api/v1/demo/airports/SKBO/weather');
    expect(requestedPaths.some((path) => path.startsWith('/media/'))).toBe(true);
  },
);
