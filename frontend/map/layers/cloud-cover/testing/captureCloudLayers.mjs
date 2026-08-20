import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const repositoryRoot = resolve(
  fileURLToPath(new URL('../../../../../', import.meta.url)),
);
const scenarioRoot = resolve(
  repositoryRoot,
  'backend/media/demo-weather/demo-colombia-001',
);

function imagePath(layer, timestamp) {
  return resolve(scenarioRoot, layer, `${timestamp}.webp`);
}

async function imageDataUrl(layer, timestamp) {
  const bytes = await readFile(imagePath(layer, timestamp));
  return `data:image/webp;base64,${bytes.toString('base64')}`;
}

function captureMarkup(timestamp, coverUrl, baseUrl) {
  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          width: 1280px;
          height: 860px;
          overflow: hidden;
          background: #07111c;
          color: #e2e8f0;
          font-family: Inter, system-ui, sans-serif;
        }
        main { padding: 30px 38px; }
        header { display: flex; align-items: end; justify-content: space-between; }
        h1 { margin: 0; font-size: 30px; }
        .time { color: #67e8f9; font: 700 24px ui-monospace, monospace; }
        .subtitle { margin: 7px 0 22px; color: #94a3b8; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        article {
          border: 1px solid #274156;
          border-radius: 14px;
          background: #0b1826;
          padding: 18px;
        }
        h2 { margin: 0 0 12px; font-size: 21px; }
        .raster {
          display: block;
          width: 100%;
          height: 570px;
          object-fit: fill;
          border: 1px solid #334155;
          border-radius: 8px;
          background: linear-gradient(150deg, #101f2d, #172c3e);
        }
        .legend { margin-top: 13px; }
        .bar { height: 16px; border-radius: 999px; border: 1px solid #475569; }
        .cover { background: linear-gradient(90deg, #00000000, #f8fafc66 25%, #e0f2fe99 50%, #bae6fdcc 75%, #7dd3fcff); }
        .base { background: linear-gradient(90deg, #dc2626ff, #f97316f2 7%, #facc15e6 19%, #22d3eed9 39%, #2563ebbf 66%, #7c3aed99); }
        .labels { display: flex; justify-content: space-between; margin-top: 5px; color: #cbd5e1; font-size: 12px; }
        .null-copy { height: 18px; margin-top: 8px; color: #fbbf24; font-size: 13px; }
      </style>
    </head>
    <body>
      <main>
        <header><h1>Fase 19 · Capas de nubes</h1><span class="time">${timestamp}</span></header>
        <p class="subtitle">Escenario demo-colombia-001 · datos locales simulados</p>
        <section class="grid">
          <article>
            <h2>Nubosidad simulada</h2>
            <img class="raster" src="${coverUrl}" alt="Raster de nubosidad simulada ${timestamp}" />
            <div class="legend"><div class="bar cover"></div><div class="labels"><span>0 %</span><span>25</span><span>50</span><span>75</span><span>100 %</span></div></div>
            <div class="null-copy"></div>
          </article>
          <article>
            <h2>Base de nubes simulada</h2>
            <img class="raster" src="${baseUrl}" alt="Raster de base de nubes simulada ${timestamp}" />
            <div class="legend"><div class="bar base"></div><div class="labels"><span>300</span><span>1.000</span><span>3.000</span><span>6.000</span><span>10.000</span><span>15.000 ft AGL</span></div></div>
            <div class="null-copy">Sin base significativa en este punto simulado</div>
          </article>
        </section>
      </main>
    </body>
  </html>`;
}

const browser = await chromium.launch({ headless: true });
try {
  for (const timestamp of ['06Z', '09Z']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    const externalRequests = [];
    page.on('request', (request) => {
      if (/^https?:/u.test(request.url())) externalRequests.push(request.url());
    });
    const [coverUrl, baseUrl] = await Promise.all([
      imageDataUrl('cloud-cover', timestamp),
      imageDataUrl('cloud-base', timestamp),
    ]);
    await page.setContent(captureMarkup(timestamp, coverUrl, baseUrl), {
      waitUntil: 'load',
    });
    await page.locator('img').evaluateAll((images) => Promise.all(
      images.map((image) => image.decode()),
    ));
    if (externalRequests.length > 0) {
      throw new Error(`Unexpected external requests: ${externalRequests.join(', ')}`);
    }
    await page.screenshot({
      path: `/tmp/phase-19-cloud-layers-${timestamp}.png`,
      fullPage: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
