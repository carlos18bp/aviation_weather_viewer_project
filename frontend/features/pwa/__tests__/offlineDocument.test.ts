import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEMO_WARNING_TEXT } from '@/components/weather/DemoWarning';

const html = readFileSync(join(__dirname, '..', '..', '..', 'public', 'offline.html'), 'utf8');

it('keeps the operational warning visible in the offline fallback', () => {
  expect(html).toContain(DEMO_WARNING_TEXT);
});

it('requests nothing from the network so it can render with no connection', () => {
  // Positive first: an empty file would satisfy every negative below.
  expect(html).toMatch(/<style>[\s\S]+<\/style>/);
  expect(html).not.toMatch(/https?:\/\//);
  expect(html).not.toMatch(/<link[^>]+stylesheet/i);
  expect(html).not.toMatch(/@font-face/i);
  expect(html).not.toMatch(/<script\s[^>]*src=/i);
  expect(html).not.toMatch(/<img\s/i);
});

it('falls back to system typefaces because the demo downloads no fonts', () => {
  expect(html).toMatch(/font-family:[^;]*system-ui/);
});

it('offers a way back that meets the touch target size', () => {
  expect(html).toMatch(/<button[^>]*>\s*Reintentar/);
  expect(html).toMatch(/min-height:\s*44px/);
});
