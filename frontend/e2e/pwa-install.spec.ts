import { expect, test, type Page } from '@playwright/test';


const MAP_BOOTSTRAP_TIMEOUT_MS = 60_000;
const WARNING = 'DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL';

/**
 * The store adopts a plain Event as long as it carries prompt() and userChoice,
 * which is what lets the native path be exercised without a real installability
 * check. `cancelable` matters: without it preventDefault() is a silent no-op and
 * the assertion would pass against a fake that does not behave like the real one.
 */
async function primeNativePrompt(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const marker = window as typeof window & { __promptCalls?: number };
    marker.__promptCalls = 0;
    window.addEventListener('load', () => {
      const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
        prompt(): Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      };
      event.prompt = () => {
        marker.__promptCalls = (marker.__promptCalls ?? 0) + 1;
        return Promise.resolve();
      };
      Object.defineProperty(event, 'userChoice', {
        value: Promise.resolve({ outcome: 'dismissed' }),
      });
      window.dispatchEvent(event);
    });
  });
}

/** Keeps the once-per-device automatic modal out of the way of the click paths. */
async function suppressAutoModal(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('aero-pwa-auto-shown', 'true');
  });
}

async function openReadyViewer(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('[data-map-status="ready"]')).toBeVisible({
    timeout: MAP_BOOTSTRAP_TIMEOUT_MS,
  });
}

test.describe('PWA install', () => {
  test(
    'the install button hands a captured browser prompt straight to the installer @flow:viewer-pwa-install @outcome:success',
    { tag: ['@flow:viewer-pwa-install', '@outcome:success'] },
    async ({ page }) => {
      await suppressAutoModal(page);
      await primeNativePrompt(page);
      await openReadyViewer(page);

      await page.getByTestId('pwa-install-fab').click();

      const confirm = page.getByTestId('pwa-install-confirm');
      await expect(confirm).toHaveText('Instalar ahora');
      await expect(page.getByTestId('pwa-install-modal').getByRole('list').first())
        .toContainText('La última escena consultada queda disponible sin conexión.');

      await confirm.click();

      await expect
        .poll(() => page.evaluate(() => (window as typeof window & { __promptCalls?: number }).__promptCalls))
        .toBe(1);
    },
  );

  test(
    'without a browser prompt the viewer explains how to install by hand @flow:viewer-pwa-install @outcome:failure',
    { tag: ['@flow:viewer-pwa-install', '@outcome:failure'] },
    async ({ page }) => {
      await suppressAutoModal(page);
      await openReadyViewer(page);

      await page.getByTestId('pwa-install-fab').click();

      const modal = page.getByTestId('pwa-install-modal');
      await expect(modal).toBeVisible();
      await expect(modal.getByRole('heading', { name: 'Instala Meteo Aero en tu dispositivo' })).toBeVisible();
      await expect(modal.getByRole('note')).toHaveText(WARNING);
      await expect(page.getByTestId('pwa-install-confirm')).toHaveCount(0);

      await page.keyboard.press('Escape');

      await expect(modal).toBeHidden();
    },
  );

  test(
    'the install entry is reachable from the mobile actions panel @flow:viewer-pwa-install @outcome:display',
    { tag: ['@flow:viewer-pwa-install', '@outcome:display'] },
    async ({ page }) => {
      await suppressAutoModal(page);
      await page.setViewportSize({ width: 412, height: 915 });
      await openReadyViewer(page);

      await page.getByTestId('responsive-action-rail').getByRole('button', { name: 'Más' }).click();

      const entry = page.getByTestId('pwa-install-button');
      await expect(entry).toBeVisible();
      await expect(entry).toHaveText('Instalar app');

      await entry.click();

      await expect(page.getByTestId('pwa-install-modal')).toBeVisible();
    },
  );
});
