import { expect, test, type Locator, type Page } from '@playwright/test';


const VIEWER = '[data-weather-viewer]';
const WARNING = 'DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL';
const PHONE_MATRIX = {
  'Mobile Chrome': { portrait: [360, 800], landscape: [800, 360] },
  'Mobile Safari WebKit': { portrait: [390, 844], landscape: [844, 390] },
} as const;
const TABLET_MATRIX = {
  'Tablet Chrome': { portrait: [800, 1280], landscape: [1280, 800] },
  'Tablet Safari WebKit': { portrait: [768, 1024], landscape: [1024, 768] },
} as const;
const PANEL_BY_LABEL = {
  Capas: 'layers',
  Lugar: 'location',
  Ruta: 'route',
  Más: 'more',
} as const;

async function openReadyViewer(page: Page, size: readonly [number, number]): Promise<Locator> {
  await page.setViewportSize({ width: size[0], height: size[1] });
  await page.goto('/');
  const viewer = page.locator(VIEWER);
  await expect(page.getByText('Mapa local listo', { exact: true })).toHaveText(
    'Mapa local listo',
    { timeout: 60_000 },
  );
  await expect(viewer).toHaveAttribute('data-frame-loading', 'false');
  await expect(page.getByTestId('weather-map-container').locator('canvas')).toHaveCount(1);
  return viewer;
}

async function openPanel(page: Page, label: 'Capas' | 'Lugar' | 'Ruta' | 'Más'): Promise<void> {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page.locator(VIEWER)).toHaveAttribute(
    'data-active-panel',
    PANEL_BY_LABEL[label],
  );
}

async function selectLayer(page: Page, viewer: Locator, layer: string): Promise<void> {
  await openPanel(page, 'Capas');
  const option = page.locator(`label[data-layer-id="${layer}"]`);
  const input = option.locator('input');
  await expect(input).toBeEnabled();
  await option.click();
  await expect(viewer).toHaveAttribute('data-active-layer', layer);
  await expect(viewer).toHaveAttribute('data-frame-loading', 'false');
}

async function rememberCanvas(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as typeof window & { __phase23Canvas?: Element | null }).__phase23Canvas = (
      document.querySelector('[data-testid="weather-map-container"] canvas')
    );
  });
}

async function sameCanvas(page: Page): Promise<boolean> {
  return page.evaluate(() => (
    (window as typeof window & { __phase23Canvas?: Element | null }).__phase23Canvas
      === document.querySelector('[data-testid="weather-map-container"] canvas')
  ));
}

async function tapMapBackground(page: Page): Promise<void> {
  const map = page.getByTestId('weather-map-container');
  const box = await map.boundingBox();
  if (box === null) throw new Error('The weather map has no visible bounds.');
  await page.touchscreen.tap(box.x + box.width * 0.67, box.y + box.height * 0.33);
}

async function chooseRouteEndpoint(
  planner: Locator,
  label: 'Origen' | 'Destino',
  icaoCode: 'SKBO' | 'SKRG',
): Promise<void> {
  await planner.getByLabel(label).fill(icaoCode);
  await planner.getByRole('option', { name: new RegExp(`^${icaoCode}\\b`) }).click();
}

async function resetViewer(page: Page, viewer: Locator): Promise<void> {
  await openPanel(page, 'Más');
  await page.getByRole('button', { name: 'Reiniciar' }).click();
  await expect(viewer).toHaveAttribute('data-active-layer', 'wind');
  await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T06:00:00Z');
  await expect(viewer).toHaveAttribute('data-active-panel', 'none');
  await expect(page).toHaveURL(/\/$/);
}

test(
  'Flow C mobile discovery preserves the scene through orientation @matrix:phone @flow:viewer-layer-explorer @flow:viewer-point-forecast @flow:viewer-touch-integration @flow:viewer-responsive-continuity @flow:viewer-enriched-reset @outcome:success @outcome:display',
  { tag: ['@matrix:phone', '@flow:viewer-layer-explorer', '@flow:viewer-point-forecast', '@flow:viewer-touch-integration', '@flow:viewer-responsive-continuity', '@flow:viewer-enriched-reset', '@outcome:success', '@outcome:display'] },
  async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    const matrix = PHONE_MATRIX[testInfo.project.name as keyof typeof PHONE_MATRIX];
    const viewer = await openReadyViewer(page, matrix.portrait);
    await rememberCanvas(page);
    await selectLayer(page, viewer, 'cloud-cover');
    await page.getByRole('button', { name: 'Cerrar panel' }).click();
    await tapMapBackground(page);
    const pointPanel = page.getByTestId('responsive-location-panel');
    await expect(pointPanel.getByRole('heading', { name: 'Evolución meteorológica del punto' })).toBeVisible();
    await expect(pointPanel.locator('section[data-state]')).toHaveAttribute('data-state', 'ready');
    await expect(pointPanel.locator('tbody tr')).toHaveCount(6);
    await selectLayer(page, viewer, 'visibility');
    await page.getByRole('button', { name: 'Mostrar los seis timestamps' }).click();
    await page.getByRole('button', { name: 'Seleccionar 09:00Z' }).click();
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T09:00:00Z');
    await page.getByRole('button', { name: 'Iniciar reproducción' }).click();
    await page.getByRole('button', { name: 'Pausar reproducción' }).click();
    await page.setViewportSize({ width: matrix.landscape[0], height: matrix.landscape[1] });
    await expect(viewer).toHaveAttribute('data-orientation', 'landscape');
    expect(await sameCanvas(page)).toBe(true);
    expect(new URL(page.url()).searchParams.get('picker')).not.toBeNull();
    await expect(page.getByText(WARNING, { exact: true })).toBeVisible();
    await resetViewer(page, viewer);
  },
);

test(
  'Flow D tablet aviation restores route, gusts and isobars @matrix:tablet @flow:viewer-tablet-aviation @flow:viewer-responsive-continuity @flow:viewer-enriched-reset @outcome:success @outcome:display',
  { tag: ['@matrix:tablet', '@flow:viewer-tablet-aviation', '@flow:viewer-responsive-continuity', '@flow:viewer-enriched-reset', '@outcome:success', '@outcome:display'] },
  async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    await page.addInitScript(() => {
      let copiedText = '';
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          readText: async () => copiedText,
          writeText: async (value: string) => {
            copiedText = value;
          },
        },
      });
    });
    const matrix = TABLET_MATRIX[testInfo.project.name as keyof typeof TABLET_MATRIX];
    const viewer = await openReadyViewer(page, matrix.portrait);
    await openPanel(page, 'Lugar');
    await page.getByLabel('Buscar aeropuerto').fill('SKBO');
    await page.getByRole('option', { name: /^SKBO\b/ }).click();
    await openPanel(page, 'Ruta');
    const planner = page.getByRole('region', { name: 'Historia aeronáutica' });
    await chooseRouteEndpoint(planner, 'Origen', 'SKBO');
    await chooseRouteEndpoint(planner, 'Destino', 'SKRG');
    await expect(viewer).toHaveAttribute('data-route-active', 'true');
    await selectLayer(page, viewer, 'wind-gusts');
    await page.locator('label').filter({ hasText: 'Isobaras' }).click();
    await expect(viewer).toHaveAttribute('data-isobars-visible', 'true');
    await openPanel(page, 'Más');
    await page.getByRole('button', { name: 'Copiar enlace de escena' }).click();
    const sceneUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(Object.fromEntries(new URL(sceneUrl).searchParams)).toMatchObject({ layer: 'wind-gusts', airport: 'SKBO', route: 'SKBO-SKRG', isobars: '1' });
    await page.goto(sceneUrl);
    await expect(page.getByText('Mapa local listo', { exact: true })).toHaveText(
      'Mapa local listo',
      { timeout: 60_000 },
    );
    await expect(viewer).toHaveAttribute('data-frame-loading', 'false', { timeout: 60_000 });
    await expect(viewer).toHaveAttribute('data-route-active', 'true', { timeout: 60_000 });
    await openPanel(page, 'Ruta');
    await rememberCanvas(page);
    await page.setViewportSize({ width: matrix.landscape[0], height: matrix.landscape[1] });
    await expect(viewer).toHaveAttribute('data-viewport-mode', 'tablet');
    await expect(viewer).toHaveAttribute('data-active-panel', 'route');
    await expect(page.getByTestId('responsive-route-panel')).toContainText('SKBO → SKRG');
    expect(await sameCanvas(page)).toBe(true);
    await expect(page.getByText(WARNING, { exact: true })).toBeVisible();
    await resetViewer(page, viewer);
  },
);
