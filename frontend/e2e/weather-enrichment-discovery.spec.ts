import { expect, test, type Locator, type Page } from '@playwright/test';


const MAP_BOOTSTRAP_TIMEOUT_MS = 60_000;
const VIEWER = '[data-weather-viewer]';

async function openReadyViewer(page: Page): Promise<Locator> {
  await page.goto('/');
  await expect(page.getByText('Mapa local listo', { exact: true })).toBeVisible({
    timeout: MAP_BOOTSTRAP_TIMEOUT_MS,
  });
  return page.locator(VIEWER);
}

async function selectAirport(page: Page, icaoCode: string): Promise<void> {
  await page.getByLabel('Buscar aeropuerto').fill(icaoCode);
  await page.getByRole('option', { name: new RegExp(`^${icaoCode}\\b`) }).click();
}

async function clickMapBackground(page: Page): Promise<void> {
  const map = page.getByTestId('weather-map-container');
  const box = await map.boundingBox();
  if (box === null) throw new Error('The weather map has no visible bounds.');
  await map.click({ position: { x: box.width * 0.62, y: box.height * 0.58 } });
}

test(
  'a public user discovers synchronized airport and local weather @flow:viewer-airport-intelligence @flow:viewer-weather-picker @flow:viewer-enriched-reset @outcome:success @outcome:display',
  {
    tag: [
      '@flow:viewer-airport-intelligence',
      '@flow:viewer-weather-picker',
      '@flow:viewer-enriched-reset',
      '@outcome:success',
      '@outcome:display',
    ],
  },
  async ({ page }) => {
    test.slow();
    const viewer = await openReadyViewer(page);
    await selectAirport(page, 'SKBO');
    const airportHeading = page.getByRole('heading', {
      name: 'El Dorado International Airport',
      level: 2,
    });
    await expect.poll(async () => ({
      airport: await airportHeading.isVisible(),
      picker: await viewer.getAttribute('data-picker-active'),
    })).toEqual({ airport: true, picker: 'false' });
    const trendPoints = page.getByLabel('Timestamps de la evolución').getByRole('button');
    await expect(trendPoints).toHaveCount(6);
    const trend09 = page.getByRole('button', { name: 'Seleccionar 09:00Z desde la evolución' });
    await trend09.click();
    await expect.poll(async () => [
      await viewer.getAttribute('data-active-timestamp'),
      await trend09.getAttribute('aria-current'),
    ]).toEqual(['2026-01-15T09:00:00Z', 'time']);
    await clickMapBackground(page);
    const picker = page.getByTestId('weather-picker-overlay');
    await expect.poll(async () => ({
      active: await viewer.getAttribute('data-picker-active'),
      values: await picker.textContent(),
    })).toEqual(expect.objectContaining({ active: 'true', values: expect.stringMatching(/°C[\s\S]*kt/) }));
    await page.getByRole('button', { name: 'Iniciar reproducción' }).click();
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T12:00:00Z');
    await page.getByRole('button', { name: 'Pausar reproducción' }).click();
    await page.getByRole('button', { name: 'Reiniciar' }).click();
    await expect.poll(async () => [
      await viewer.getAttribute('data-active-layer'),
      await viewer.getAttribute('data-active-timestamp'),
      await viewer.getAttribute('data-picker-active'),
      new URL(page.url()).search,
    ]).toEqual(['wind', '2026-01-15T06:00:00Z', 'false', '']);
  },
);
