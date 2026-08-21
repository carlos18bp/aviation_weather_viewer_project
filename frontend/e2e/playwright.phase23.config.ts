import { defineConfig, devices } from '@playwright/test';


const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const localWebKitHeaded = process.env.PHASE23_WEBKIT_HEADED === '1';

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'e2e-results/phase23-results.json' }],
    ['./reporters/flow-coverage-reporter.mjs', { outputDir: 'e2e-results' }],
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
          command: '../backend/venv/bin/python ../backend/manage.py runserver 127.0.0.1:8000',
          url: 'http://127.0.0.1:8000/api/v1/health',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
        {
          command: 'npm run dev -- --port 3000',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      ],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      grepInvert: /@matrix:(?:phone|tablet)/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'Mobile Chrome',
      grep: /@matrix:phone/,
      use: { ...devices['Pixel 5'], browserName: 'chromium', viewport: { width: 360, height: 800 } },
    },
    {
      name: 'Mobile Safari WebKit',
      grep: /@matrix:phone/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
        headless: !localWebKitHeaded,
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'Tablet Chrome',
      grep: /@matrix:tablet/,
      use: { ...devices['iPad Mini'], browserName: 'chromium', viewport: { width: 800, height: 1280 } },
    },
    {
      name: 'Tablet Safari WebKit',
      grep: /@matrix:tablet/,
      use: {
        ...devices['iPad Mini'],
        browserName: 'webkit',
        headless: !localWebKitHeaded,
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
});
