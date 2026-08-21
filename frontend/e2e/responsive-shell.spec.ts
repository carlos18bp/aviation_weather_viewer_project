import { expect, test, type Locator, type Page } from '@playwright/test';


const MAP_BOOTSTRAP_TIMEOUT_MS = 60_000;
const VIEWER = '[data-weather-viewer]';
const WARNING = 'DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL';

type Orientation = 'portrait' | 'landscape';
type ViewportMode = 'phone' | 'tablet' | 'desktop';

async function openReadyViewer(
  page: Page,
  width: number,
  height: number,
): Promise<Locator> {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  const viewer = page.locator(VIEWER);
  await expect(page.getByText('Mapa local listo', { exact: true })).toHaveText(
    'Mapa local listo',
    { timeout: MAP_BOOTSTRAP_TIMEOUT_MS },
  );
  await expect(viewer).toHaveAttribute('data-active-layer', 'wind');
  await expect(viewer).toHaveAttribute('data-frame-loading', 'false');
  await expect(page.getByTestId('weather-map-container').locator('canvas')).toHaveCount(1);
  return viewer;
}

async function expectLayout(
  viewer: Locator,
  mode: ViewportMode,
  orientation: Orientation,
  layout: string,
): Promise<void> {
  await expect(viewer).toHaveAttribute('data-viewport-mode', mode);
  await expect(viewer).toHaveAttribute('data-orientation', orientation);
  await expect(viewer.getByTestId('responsive-panel-host')).toHaveAttribute('data-layout', layout);
}

async function expectPermanentChrome(page: Page): Promise<void> {
  await expect(page.getByText(WARNING, { exact: true })).toBeVisible();
  await expect(page.getByLabel('UTC visible sincronizado')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Línea de tiempo meteorológica' })).toBeVisible();
}

async function rememberMapIdentity(page: Page): Promise<void> {
  await page.evaluate(() => {
    const phaseWindow = window as typeof window & {
      __phase15Canvas?: HTMLCanvasElement;
      __phase15Context?: RenderingContext | null;
      __phase15MapRoot?: Element;
    };
    const mapRoot = document.querySelector('[data-testid="weather-map-container"]');
    const canvas = mapRoot?.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas || !mapRoot) throw new Error('MapLibre did not create its map surface.');
    phaseWindow.__phase15Canvas = canvas;
    phaseWindow.__phase15Context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    phaseWindow.__phase15MapRoot = mapRoot;
  });
}

async function expectStableMapIdentity(page: Page): Promise<void> {
  const identity = await page.evaluate(() => {
    const phaseWindow = window as typeof window & {
      __phase15Canvas?: HTMLCanvasElement;
      __phase15Context?: RenderingContext | null;
      __phase15MapRoot?: Element;
    };
    const mapRoot = document.querySelector('[data-testid="weather-map-container"]');
    const canvas = mapRoot?.querySelector<HTMLCanvasElement>('canvas');
    const context = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    return {
      canvasCount: mapRoot?.querySelectorAll('canvas').length ?? 0,
      mapCount: document.querySelectorAll('[data-testid="weather-map-container"]').length,
      sameCanvas: canvas === phaseWindow.__phase15Canvas,
      sameContext: context === phaseWindow.__phase15Context,
      sameMapRoot: mapRoot === phaseWindow.__phase15MapRoot,
    };
  });

  expect(identity).toEqual({
    canvasCount: 1,
    mapCount: 1,
    sameCanvas: true,
    sameContext: true,
    sameMapRoot: true,
  });
}

async function openPanel(
  page: Page,
  viewer: Locator,
  label: 'Capas' | 'Lugar' | 'Ruta' | 'Más',
  panel: 'layers' | 'location' | 'route' | 'more',
): Promise<Locator> {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(viewer).toHaveAttribute('data-active-panel', panel);
  await expect(viewer).toHaveAttribute('data-snap-point', 'peek');
  const responsivePanel = page.getByTestId('responsive-panel');
  await expect(responsivePanel).toHaveAttribute('data-panel', panel);
  return responsivePanel;
}

async function expandPanel(page: Page, viewer: Locator): Promise<void> {
  await page.getByRole('button', { name: 'Expandir panel' }).click();
  await expect(viewer).toHaveAttribute('data-snap-point', 'half');
  await page.getByRole('button', { name: 'Expandir panel' }).click();
  await expect(viewer).toHaveAttribute('data-snap-point', 'full');
  await expect(page.getByRole('heading', { name: /Capas y leyenda|Lugar y coordenada|Aeropuerto|Ruta y viento relativo|Más acciones/ })).toBeFocused();
}

async function selectAirport(page: Page, icaoCode: string): Promise<void> {
  await page.getByLabel('Buscar aeropuerto').fill(icaoCode);
  await page.getByRole('option', { name: new RegExp(`^${icaoCode}\\b`) }).click();
}

async function selectRouteEndpoint(
  planner: Locator,
  label: 'Origen' | 'Destino',
  icaoCode: string,
): Promise<void> {
  await planner.getByLabel(label).fill(icaoCode);
  await planner.getByRole('option', { name: new RegExp(`^${icaoCode}\\b`) }).click();
}

async function clickMapBackground(page: Page): Promise<void> {
  const map = page.getByTestId('weather-map-container');
  const box = await map.boundingBox();
  if (box === null) throw new Error('The weather map has no visible bounds.');
  await map.click({ position: { x: box.width * 0.62, y: box.height * 0.58 } });
}

async function expectTouchTargets(page: Page): Promise<void> {
  const violations = await page.locator(VIEWER).evaluate((root) => {
    const controls = root.querySelectorAll<HTMLElement>(
      'button, summary, label:has(input[type="checkbox"]), label:has(input[type="radio"])',
    );
    return [...controls].flatMap((control) => {
      const bounds = control.getBoundingClientRect();
      const style = window.getComputedStyle(control);
      const visible = bounds.width > 0
        && bounds.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden';
      if (!visible || (bounds.width >= 43.5 && bounds.height >= 43.5)) return [];
      const name = control.getAttribute('aria-label')
        ?? control.getAttribute('title')
        ?? control.textContent?.trim()
        ?? control.tagName;
      return [`${name}: ${bounds.width.toFixed(1)}×${bounds.height.toFixed(1)}`];
    });
  });
  expect(violations).toEqual([]);
}

// quality: allow-too-many-assertions (un único journey de continuidad responsive conserva panel, mapa y warning entre orientaciones)
// quality: allow-test-too-long (un único journey de continuidad responsive debe cruzar phone portrait y landscape sin fragmentar el flujo)
test(
  'phone portrait and landscape keep the Phase 14 journey touch-accessible without recreating MapLibre @flow:viewer-airport-intelligence @flow:viewer-weather-picker @flow:viewer-route-story @flow:viewer-atmospheric-layers @flow:viewer-scene-sharing @flow:viewer-presentation-mode @flow:viewer-enriched-reset @outcome:success @outcome:display',
  {
    tag: [
      '@flow:viewer-airport-intelligence',
      '@flow:viewer-weather-picker',
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
    test.setTimeout(300_000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const viewer = await openReadyViewer(page, 390, 844);
    await expectLayout(viewer, 'phone', 'portrait', 'phone-sheet');
    await expectPermanentChrome(page);
    await rememberMapIdentity(page);

    const sheet = await openPanel(page, viewer, 'Capas', 'layers');
    await page.getByRole('button', { name: 'Expandir panel' }).click();
    await expect(viewer).toHaveAttribute('data-snap-point', 'half');
    await expectPermanentChrome(page);
    await page.screenshot({ path: 'test-results/phase15-390x844.png' });
    await page.getByRole('button', { name: 'Expandir panel' }).click();
    await expect(viewer).toHaveAttribute('data-snap-point', 'full');
    await expect(page.getByRole('heading', { name: 'Capas y leyenda' })).toBeFocused();
    await expectTouchTargets(page);
    await page.locator('label[data-layer-id="precipitation"]').click();
    await page.locator('label').filter({ hasText: 'Isobaras' }).click();
    await expect(viewer).toHaveAttribute('data-active-layer', 'precipitation');
    await expect(viewer).toHaveAttribute('data-isobars-visible', 'true');
    await expect(viewer).toHaveAttribute('data-snap-point', 'peek');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(viewer).toHaveAttribute('data-active-panel', 'none');
    await expect(page.getByRole('button', { name: 'Capas', exact: true })).toBeFocused();

    await page.getByRole('button', { name: 'Mostrar los seis timestamps' }).click();
    await page.getByRole('button', { name: 'Seleccionar 12:00Z' }).click();
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T12:00:00Z');

    await openPanel(page, viewer, 'Lugar', 'location');
    await expandPanel(page, viewer);
    await selectAirport(page, 'SKBO');
    await expect(viewer).toHaveAttribute('data-active-panel', 'airport');
    await expect(page.getByRole('heading', {
      name: 'El Dorado International Airport',
      level: 2,
    })).toBeAttached();
    await expandPanel(page, viewer);
    await page.getByRole('button', { name: 'Seleccionar 09:00Z desde la evolución' }).click();
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T09:00:00Z');
    await page.getByRole('button', { name: 'Cerrar panel', exact: true }).click();

    await clickMapBackground(page);
    await expect(viewer).toHaveAttribute('data-active-panel', 'location');
    await expect(viewer).toHaveAttribute('data-picker-active', 'true');
    await expect(page.getByRole('heading', { name: 'Evolución meteorológica del punto' })).toBeAttached();
    await expect(page.getByTestId('responsive-location-panel')).toContainText('°C');
    await expect(page.getByTestId('responsive-location-panel')).toContainText('kt');

    await openPanel(page, viewer, 'Ruta', 'route');
    await expandPanel(page, viewer);
    const planner = page.getByRole('region', { name: 'Historia aeronáutica' });
    await selectRouteEndpoint(planner, 'Origen', 'SKBO');
    await selectRouteEndpoint(planner, 'Destino', 'SKRG');
    await expect(viewer).toHaveAttribute('data-route-active', 'true');
    await expandPanel(page, viewer);
    await expect(page.getByRole('heading', { name: 'Perfil de viento sobre ruta' })).toBeAttached();
    await expect(page.getByTestId('responsive-route-panel')).toContainText('SKBO → SKRG');
    await expect(page.getByTestId('responsive-route-panel')).toContainText('no usar para planificación de vuelo');
    await page.getByRole('button', { name: 'Cerrar panel', exact: true }).click();

    await openPanel(page, viewer, 'Más', 'more');
    await expandPanel(page, viewer);
    await page.getByRole('button', { name: 'Copiar enlace de escena' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Enlace de escena copiado.' })).toBeVisible();
    await page.getByRole('button', { name: 'Modo presentación' }).click();
    await expect(viewer).toHaveAttribute('data-presentation-mode', 'true');
    await expect(page.getByRole('button', { name: 'Salir de presentación' })).toBeVisible();
    await expectPermanentChrome(page);
    await page.getByRole('button', { name: 'Salir de presentación' }).click();
    await openPanel(page, viewer, 'Más', 'more');
    await expandPanel(page, viewer);
    await page.getByRole('button', { name: 'Reiniciar' }).click();
    await expect(viewer).toHaveAttribute('data-active-layer', 'wind');
    await expect(viewer).toHaveAttribute('data-active-timestamp', '2026-01-15T06:00:00Z');
    await expect(viewer).toHaveAttribute('data-route-active', 'false');

    await page.setViewportSize({ width: 844, height: 390 });
    await expectLayout(viewer, 'phone', 'landscape', 'phone-drawer');
    await expectStableMapIdentity(page);
    await expectPermanentChrome(page);
    const drawer = await openPanel(page, viewer, 'Capas', 'layers');
    const drawerBox = await drawer.boundingBox();
    expect(drawerBox).not.toBeNull();
    expect(drawerBox!.width).toBeLessThanOrEqual(844 * 0.42 + 1);
    await expectTouchTargets(page);
    await page.screenshot({ path: 'test-results/phase15-844x390.png' });
  },
);

// quality: allow-too-many-assertions (un único journey de continuidad responsive conserva geometría tablet y desktop sobre la misma superficie)
test(
  'tablet layouts preserve the 320px panel and become desktop with the same MapLibre surface @flow:viewer-demo-journey @outcome:success @outcome:display',
  { tag: ['@flow:viewer-demo-journey', '@outcome:success', '@outcome:display'] },
  async ({ page }) => {
    test.setTimeout(240_000);
    const viewer = await openReadyViewer(page, 768, 1024);
    await expectLayout(viewer, 'tablet', 'portrait', 'tablet-overlay');
    await expectPermanentChrome(page);
    await rememberMapIdentity(page);

    let panel = await openPanel(page, viewer, 'Capas', 'layers');
    await expect(page.getByRole('region', { name: 'Leyenda compacta de Viento' })).toBeVisible();
    let panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.width).toBe(320);
    await expectTouchTargets(page);
    await page.screenshot({ path: 'test-results/phase15-768x1024.png' });

    await openPanel(page, viewer, 'Lugar', 'location');
    await expect(page.getByLabel('Buscar aeropuerto')).toBeVisible({
      timeout: MAP_BOOTSTRAP_TIMEOUT_MS,
    });
    await openPanel(page, viewer, 'Ruta', 'route');
    await expect(page.getByRole('region', { name: 'Historia aeronáutica' })).toBeVisible();
    await openPanel(page, viewer, 'Más', 'more');
    await expect(page.getByRole('button', { name: 'Copiar enlace de escena' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Modo presentación' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reiniciar' })).toBeVisible();

    panel = await openPanel(page, viewer, 'Capas', 'layers');
    await page.setViewportSize({ width: 1024, height: 768 });
    await expectLayout(viewer, 'tablet', 'landscape', 'tablet-sidebar');
    await expectStableMapIdentity(page);
    await expectPermanentChrome(page);
    panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.width).toBe(320);
    const mapBox = await page.getByTestId('weather-map-container').boundingBox();
    expect(mapBox).not.toBeNull();
    expect(mapBox!.width).toBe(704);
    await page.screenshot({ path: 'test-results/phase15-1024x768.png' });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await expectLayout(viewer, 'desktop', 'landscape', 'desktop');
    await expectStableMapIdentity(page);
    await expectPermanentChrome(page);
    await expect(page.getByTestId('responsive-action-rail')).toHaveCount(0);
    await expect(page.getByLabel('Slot para panel aeroportuario')).toBeVisible();
    await expect(page.getByLabel('Slot para capas y leyenda')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copiar enlace de escena' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Modo presentación' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reiniciar' })).toBeVisible();
  },
);
