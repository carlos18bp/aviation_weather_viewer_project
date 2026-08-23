/**
 * Rasterises the PWA icon artwork into the PNG sizes the manifest and iOS need.
 *
 * Everything lands in public/icons/ on purpose: Next's app/icon.* conventions
 * mint hashed URLs, and both the manifest and the service worker precache list
 * need literal, stable paths.
 *
 * Run manually after editing public/icons/app-icon*.svg; the generated PNGs are
 * committed so neither the build nor CI depends on this script:
 *
 *   cd frontend && node scripts/generate-pwa-icons.mjs
 *
 * It uses sharp, which ships with Next as a transitive dependency (adding a
 * direct dependency for a one-off dev utility is not worth it). If a future
 * Next upgrade drops sharp, rasterise with Playwright instead — that one is a
 * declared devDependency.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(frontendRoot, 'public', 'icons');

const TARGETS = [
  { source: 'app-icon.svg', size: 192, output: join(iconsDir, 'icon-192.png') },
  { source: 'app-icon.svg', size: 512, output: join(iconsDir, 'icon-512.png') },
  { source: 'app-icon-maskable.svg', size: 192, output: join(iconsDir, 'maskable-192.png') },
  { source: 'app-icon-maskable.svg', size: 512, output: join(iconsDir, 'maskable-512.png') },
  { source: 'app-icon.svg', size: 180, output: join(iconsDir, 'apple-touch-icon-180.png') },
];

async function main() {
  for (const target of TARGETS) {
    const svg = await readFile(join(iconsDir, target.source));
    const png = await sharp(svg, { density: 384 })
      .resize(target.size, target.size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(target.output, png);
    console.log(`${target.output} (${target.size}px, ${png.length} B)`);
  }
}

await main();
