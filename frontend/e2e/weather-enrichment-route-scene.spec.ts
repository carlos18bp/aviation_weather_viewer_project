import { expect, test, type Locator, type Page } from '@playwright/test';


const MAP_BOOTSTRAP_TIMEOUT_MS = 60_000;
const VIEWER = '[data-weather-viewer]';

async function openReadyViewer(page: Page, url = '/'): Promise<Locator> {
  await page.goto(url);
  await expect(page.getByText('Mapa local listo', { exact: true })).toBeVisible({
    timeout: MAP_BOOTSTRAP_TIMEOUT_MS,
  });
  return page.locator(VIEWER);
}

async function selectRouteEndpoint(
  planner: Locator,
  label: 'Origen' | 'Destino',
  icaoCode: string,
): Promise<void> {
  await planner.getByLabel(label).fill(icaoCode);
  await planner.getByRole('option', { name: new RegExp(`^${icaoCode}\\b`) }).click();
}

async function routeProfileState(page: Page, viewer: Locator) {
  const profile = page.getByTestId('route-profile-overlay');
  const text = await profile.textContent();
  return {
    active: await viewer.getAttribute('data-route-active'),
    route: text?.includes('SKBO → SKRG'),
    distance: text?.includes('NM'),
    disclaimer: text?.includes('no usar para planificación de vuelo'),
  };
}

test(
  'a public user restores the enriched route scene @flow:viewer-route-story @flow:viewer-atmospheric-layers @flow:viewer-scene-sharing @flow:viewer-presentation-mode @flow:viewer-enriched-reset @outcome:success @outcome:display',
  {
    tag: [
      '@flow:viewer-route-story',
      '@flow:viewer-atmospheric-layers',
      '@flow:viewer-scene-sharing',
      '@flow:viewer-presentation-mode',
      '@flow:viewer-enriched-reset',
      '@outcome:success',
      '@outcome:display',
    ],
  },
  async ({ context, page }) => {
    test.slow();
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const viewer = await openReadyViewer(page);
    // Catches a ready-map race that let route controls run before the base wind scene committed.
    await expect(viewer).toHaveAttribute('data-active-layer', 'wind');
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T06:00:00Z');
    await page.getByTestId('enriched-layer-panel').locator('summary').click();
    const planner = page.getByRole('region', { name: 'Historia aeronáutica' });
    await selectRouteEndpoint(planner, 'Origen', 'SKBO');
    await selectRouteEndpoint(planner, 'Destino', 'SKRG');
    await expect.poll(() => routeProfileState(page, viewer)).toEqual({
      active: 'true', route: true, distance: true, disclaimer: true,
    });
    await page.getByRole('button', { name: /Precipitación/ }).click();
    await page.getByLabel('Isobaras').check();
    await page.getByRole('button', { name: 'Seleccionar 12:00Z' }).click();
    await expect.poll(async () => [
      await viewer.getAttribute('data-active-layer'),
      await viewer.getAttribute('data-isobars-visible'),
      await viewer.getAttribute('data-active-timestamp'),
    ]).toEqual(['precipitation', 'true', '2026-01-15T12:00:00Z']);
    await page.getByRole('button', { name: 'Copiar enlace de escena' }).click();
    const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
    await expect.poll(async () => ({
      feedback: await page.getByRole('status').filter({ hasText: 'Enlace de escena copiado.' }).textContent(),
      query: new URL(copiedUrl).searchParams.toString(),
    })).toEqual({
      feedback: 'Enlace de escena copiado.',
      query: 'layer=precipitation&t=12Z&route=SKBO-SKRG&isobars=1',
    });
    await openReadyViewer(page, copiedUrl);
    await expect.poll(async () => ({
      scene: [
        await viewer.getAttribute('data-route-active'),
        await viewer.getAttribute('data-active-layer'),
        await viewer.getAttribute('data-active-timestamp'),
        await viewer.getAttribute('data-isobars-visible'),
      ],
      profile: await routeProfileState(page, viewer),
    })).toEqual(expect.objectContaining({
      scene: ['true', 'precipitation', '2026-01-15T12:00:00Z', 'true'],
      profile: expect.objectContaining({ route: true }),
    }));
    await page.getByRole('button', { name: 'Modo presentación' }).click();
    await expect.poll(async () => [
      await viewer.getAttribute('data-presentation-mode'),
      await page.getByRole('button', { name: 'Salir de presentación' }).isVisible(),
      await page.getByText('DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL').isVisible(),
    ]).toEqual(['true', true, true]);
    await page.getByRole('button', { name: 'Salir de presentación' }).click();
    await page.getByRole('button', { name: 'Reiniciar' }).click();
    await expect.poll(async () => [
      await viewer.getAttribute('data-active-layer'),
      await viewer.getAttribute('data-active-timestamp'),
      await viewer.getAttribute('data-route-active'),
      new URL(page.url()).search,
    ], { timeout: MAP_BOOTSTRAP_TIMEOUT_MS }).toEqual([
      'wind',
      '2026-01-15T06:00:00Z',
      'false',
      '',
    ]);
  },
);
