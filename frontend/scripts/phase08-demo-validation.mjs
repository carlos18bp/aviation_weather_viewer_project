#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const DEFAULT_URL = 'https://aviation-weather-platform.projectapp.co';
const DEFAULT_TIMESTAMP = '2026-01-15T06:00:00Z';
const TIMESTAMPS = [
  '2026-01-15T00:00:00Z',
  '2026-01-15T03:00:00Z',
  DEFAULT_TIMESTAMP,
  '2026-01-15T09:00:00Z',
  '2026-01-15T12:00:00Z',
  '2026-01-15T15:00:00Z',
];
const AIRPORTS = [
  { icao: 'SKBO', longitude: -74.1469, latitude: 4.70159 },
  { icao: 'SKRG', longitude: -75.4231, latitude: 6.16454 },
  { icao: 'SKCL', longitude: -76.381898, latitude: 3.542717 },
];

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_URL,
    browser: 'chrome',
    durationSeconds: 600,
    mode: 'stability',
    output: '/tmp/phase08-demo-validation.json',
    screenshot: '/tmp/phase08-demo-1920x1080.png',
  };

  for (const value of argv) {
    const [key, raw] = value.replace(/^--/, '').split('=', 2);
    if (key === 'base-url') args.baseUrl = raw;
    if (key === 'browser') args.browser = raw;
    if (key === 'duration-seconds') args.durationSeconds = Number(raw);
    if (key === 'mode') args.mode = raw;
    if (key === 'output') args.output = raw;
    if (key === 'screenshot') args.screenshot = raw;
  }

  if (!['chrome', 'msedge'].includes(args.browser)) {
    throw new Error(`Unsupported browser: ${args.browser}`);
  }
  if (!['airports', 'fallback', 'fps', 'journey', 'stability'].includes(args.mode)) {
    throw new Error(`Unsupported mode: ${args.mode}`);
  }
  if (!Number.isFinite(args.durationSeconds) || args.durationSeconds < 0) {
    throw new Error('duration-seconds must be a non-negative number.');
  }
  return args;
}

function timestampLabel(timestamp) {
  return `${timestamp.slice(11, 13)}:00Z`;
}

async function waitForViewer(page, layer = null, timestamp = null) {
  await page.waitForFunction(
    ({ expectedLayer, expectedTimestamp }) => {
      const viewer = document.querySelector('[data-weather-viewer]');
      const mapReady = document.body.textContent?.includes('Mapa local listo');
      if (!viewer || !mapReady || viewer.getAttribute('data-frame-loading') !== 'false') return false;
      if (expectedLayer && viewer.getAttribute('data-active-layer') !== expectedLayer) return false;
      return !expectedTimestamp || viewer.getAttribute('data-active-timestamp') === expectedTimestamp;
    },
    { expectedLayer: layer, expectedTimestamp: timestamp },
    { timeout: 60_000 },
  );
}

async function resetViewer(page) {
  await page.getByRole('button', { name: 'Reiniciar' }).click();
  await waitForViewer(page, 'wind', DEFAULT_TIMESTAMP);
}

async function chooseLayer(page, layer) {
  const name = layer === 'wind' ? /Viento/ : /Temperatura/;
  await page.getByRole('button', { name }).click();
  await waitForViewer(page, layer, null);
}

async function chooseTimestamp(page, timestamp) {
  await page.getByRole('button', { name: `Seleccionar ${timestampLabel(timestamp)}` }).click();
  await waitForViewer(page, null, timestamp);
}

function projectAirport(width, height, airport, afterReset = false) {
  const west = -84;
  const east = -64;
  const mapCenterLatitude = 4.5;
  const pixelsPerDegree = width / (east - west);
  const worldSize = pixelsPerDegree * 360;
  const mercatorY = (latitude) => (
    (1 - Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) / Math.PI) / 2
  );
  return {
    x: ((airport.longitude - west) / (east - west)) * width,
    y: height / 2
      + (mercatorY(airport.latitude) - mercatorY(mapCenterLatitude)) * worldSize
      + (afterReset ? 0 : Math.max(0, height - 720) * 0.025),
  };
}

async function selectAndCloseAirport(page, airport) {
  await resetViewer(page);
  const map = page.getByTestId('weather-map-container');
  const box = await map.boundingBox();
  if (!box) throw new Error('Map container has no bounding box.');
  await map.click({ position: projectAirport(box.width, box.height, airport, true) });
  await page.getByText(airport.icao, { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
  await page.getByRole('button', { name: 'Cerrar panel del aeropuerto' }).click();
  await page.getByRole('heading', { name: 'Selecciona un aeropuerto' }).waitFor();
}

async function playTwoTicks(page) {
  const viewer = page.locator('[data-weather-viewer]');
  const initial = await viewer.getAttribute('data-active-timestamp');
  await page.getByRole('button', { name: 'Iniciar reproducción' }).click();
  await page.waitForFunction(
    (previous) => document.querySelector('[data-weather-viewer]')?.getAttribute('data-active-timestamp') !== previous,
    initial,
    { timeout: 15_000 },
  );
  const first = await viewer.getAttribute('data-active-timestamp');
  await page.waitForFunction(
    (previous) => document.querySelector('[data-weather-viewer]')?.getAttribute('data-active-timestamp') !== previous,
    first,
    { timeout: 15_000 },
  );
  await page.getByRole('button', { name: 'Pausar reproducción' }).click();
  await page.getByRole('button', { name: 'Iniciar reproducción' }).waitFor();
}

async function runJourney(page) {
  await waitForViewer(page, 'wind', DEFAULT_TIMESTAMP);
  const map = page.getByTestId('weather-map-container');
  const box = await map.boundingBox();
  if (!box) throw new Error('Map container has no bounding box.');
  await map.click({ position: projectAirport(box.width, box.height, AIRPORTS[0]) });
  await page.getByText('SKBO', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
  await chooseLayer(page, 'temperature');
  for (const timestamp of TIMESTAMPS) await chooseTimestamp(page, timestamp);
  await page.getByRole('button', { name: 'Timestamp anterior' }).click();
  await waitForViewer(page, null, '2026-01-15T12:00:00Z');
  await page.getByRole('button', { name: 'Timestamp siguiente' }).click();
  await waitForViewer(page, null, '2026-01-15T15:00:00Z');
  await playTwoTicks(page);
  await chooseLayer(page, 'wind');
  await resetViewer(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForViewer(page, 'wind', DEFAULT_TIMESTAMP);
}

async function measureFps(page, milliseconds = 2_000) {
  return page.evaluate((duration) => new Promise((resolve) => {
    let frames = 0;
    const started = performance.now();
    const tick = (now) => {
      frames += 1;
      if (now - started >= duration) {
        resolve(Number(((frames * 1_000) / (now - started)).toFixed(1)));
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), milliseconds);
}

async function gpuRenderer(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.maplibregl-canvas');
    const context = canvas?.getContext('webgl2');
    const extension = context?.getExtension('WEBGL_debug_renderer_info');
    if (!context || !extension) return null;
    return context.getParameter(extension.UNMASKED_RENDERER_WEBGL);
  });
}

async function retainedHeapBytes(cdp) {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  return metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? null;
}

async function exerciseMap(page) {
  const map = page.getByTestId('weather-map-container');
  const box = await map.boundingBox();
  if (!box) throw new Error('Map container has no bounding box.');
  const x = box.x + box.width * 0.55;
  const y = box.y + box.height * 0.55;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y + 50, { steps: 8 });
  await page.mouse.up();
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await resetViewer(page);
}

async function activateFallback(page) {
  await chooseLayer(page, 'wind');
  const triggered = await page.evaluate(() => {
    const prototype = WebGL2RenderingContext.prototype;
    const original = prototype.drawArraysInstanced;
    prototype.drawArraysInstanced = function failParticleDraw(
      mode,
      first,
      count,
      instanceCount,
    ) {
      if (mode === this.LINES && first === 0 && count === 2 && instanceCount === 2_500) {
        prototype.drawArraysInstanced = original;
        throw new Error('Phase 08 injected wind renderer failure.');
      }
      return original.call(this, mode, first, count, instanceCount);
    };
    return true;
  });
  if (!triggered) throw new Error('Could not inject the wind renderer failure.');
  await page.locator('[data-status="fallback"]').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForTimeout(3_000);
  return page.locator('[data-status="fallback"]').innerText();
}

async function runStability(page, cdp, durationSeconds, evidence) {
  const started = Date.now();
  const deadline = started + durationSeconds * 1_000;
  evidence.heapSamples.push({ second: 0, bytes: await retainedHeapBytes(cdp) });
  evidence.fpsSamples.push({ second: 0, mode: 'particles', fps: await measureFps(page) });

  for (const airport of AIRPORTS) await selectAndCloseAirport(page, airport);
  await exerciseMap(page);

  let cycle = 0;
  let nextSample = started + 60_000;
  let fallbackTriggered = false;
  while (Date.now() < deadline) {
    await chooseLayer(page, cycle % 2 === 0 ? 'temperature' : 'wind');
    await chooseTimestamp(page, TIMESTAMPS[cycle % TIMESTAMPS.length]);
    await page.getByRole('button', { name: 'Timestamp siguiente' }).click();
    await waitForViewer(page);
    await page.getByRole('button', { name: 'Timestamp anterior' }).click();
    await waitForViewer(page);
    if (cycle % 3 === 0) await playTwoTicks(page);

    if (!fallbackTriggered && Date.now() >= started + durationSeconds * 850) {
      evidence.fallbackMessage = await activateFallback(page);
      fallbackTriggered = true;
      evidence.fpsSamples.push({
        second: Math.round((Date.now() - started) / 1_000),
        mode: 'fallback',
        fps: await measureFps(page),
      });
    }
    if (Date.now() >= nextSample) {
      const second = Math.round((Date.now() - started) / 1_000);
      evidence.heapSamples.push({ second, bytes: await retainedHeapBytes(cdp) });
      if (!fallbackTriggered) {
        evidence.fpsSamples.push({ second, mode: 'particles', fps: await measureFps(page) });
      }
      nextSample += 60_000;
    }
    cycle += 1;
  }
  if (!fallbackTriggered) {
    evidence.fallbackMessage = await activateFallback(page);
    evidence.fpsSamples.push({
      second: Math.round((Date.now() - started) / 1_000),
      mode: 'fallback',
      fps: await measureFps(page),
    });
  }
  await resetViewer(page);
  evidence.cycles = cycle;
  evidence.durationSeconds = Number(((Date.now() - started) / 1_000).toFixed(1));
  evidence.heapSamples.push({ second: Math.round(evidence.durationSeconds), bytes: await retainedHeapBytes(cdp) });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = {
    browser: args.browser,
    browserVersion: null,
    gpuRenderer: null,
    baseUrl: args.baseUrl,
    mode: args.mode,
    viewport: { width: 1920, height: 1080 },
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationSeconds: 0,
    cycles: 0,
    fallbackMessage: null,
    fpsSamples: [],
    heapSamples: [],
    consoleErrors: [],
    ignoredConsoleMessages: [],
    pageErrors: [],
    requestFailures: [],
    externalRequests: [],
    requestHosts: [],
    status: 'running',
  };

  const browser = await chromium.launch({
    channel: args.browser,
    headless: true,
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--enable-precise-memory-info',
    ],
  });
  result.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: result.viewport });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');

  const requestHosts = new Set();
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const location = message.location().url;
    if (message.text().includes('CONTEXT_LOST_WEBGL') || location.endsWith('/favicon.ico')) {
      result.ignoredConsoleMessages.push({ message: message.text(), location });
    } else {
      result.consoleErrors.push({ message: message.text(), location });
    }
  });
  page.on('pageerror', (error) => result.pageErrors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'http:' || url.protocol === 'https:') requestHosts.add(url.hostname);
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText ?? 'unknown';
    if (!errorText.includes('ERR_ABORTED')) {
      result.requestFailures.push({ url: request.url(), errorText });
    }
  });

  try {
    await page.goto(args.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForViewer(page, 'wind', DEFAULT_TIMESTAMP);
    result.gpuRenderer = await gpuRenderer(page);
    fs.mkdirSync(path.dirname(path.resolve(args.screenshot)), { recursive: true });
    await page.screenshot({ path: args.screenshot, fullPage: false });
    if (args.mode === 'journey') await runJourney(page);
    if (args.mode === 'airports') {
      for (const airport of AIRPORTS) await selectAndCloseAirport(page, airport);
    }
    if (args.mode === 'fallback') result.fallbackMessage = await activateFallback(page);
    if (args.mode === 'stability') {
      await runStability(page, cdp, args.durationSeconds, result);
    } else {
      result.fpsSamples.push({
        second: 0,
        mode: args.mode === 'fallback' ? 'fallback' : 'particles',
        fps: await measureFps(page),
      });
      result.heapSamples.push({ second: 0, bytes: await retainedHeapBytes(cdp) });
    }
    await page.screenshot({ path: args.screenshot, fullPage: false });
    result.requestHosts = [...requestHosts].sort();
    const allowedHostname = new URL(args.baseUrl).hostname;
    result.externalRequests = result.requestHosts.filter((hostname) => hostname !== allowedHostname);
    const finalHeap = result.heapSamples.at(-1)?.bytes;
    const initialHeap = result.heapSamples[0]?.bytes;
    result.heapGrowthBytes = finalHeap !== null && initialHeap !== null ? finalHeap - initialHeap : null;
    result.status = result.consoleErrors.length === 0
      && result.pageErrors.length === 0
      && result.requestFailures.length === 0
      && result.externalRequests.length === 0
      ? 'passed'
      : 'failed';
  } catch (error) {
    result.status = 'failed';
    result.failure = error instanceof Error ? error.stack : String(error);
    await page.screenshot({ path: args.screenshot, fullPage: false }).catch(() => undefined);
  } finally {
    result.finishedAt = new Date().toISOString();
    writeJson(args.output, result);
    await browser.close();
  }

  if (result.status !== 'passed') process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
