// Smoke test: opens every lesson in headless Chromium, fails on any shader/JS
// error, and checks that each canvas actually drew something.
//
//   npm run serve            (in another terminal)
//   npm test                 (or: node tests/smoke.mjs http://localhost:8080)
import { createRequire } from 'node:module';

// require() also finds a globally installed Playwright (NODE_PATH); ESM import does not.
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] || 'http://localhost:8080';
const shotDir = process.env.SHOTS || '';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.goto(`${base}/#/`);
await page.waitForSelector('.hero');
const ids = await page.evaluate(async () => {
  const mod = await import('./js/lessons/index.js');
  return mod.allLessons.map((l) => ({ id: l.id, hasCode: l.files.length > 0, hasShaders: l.files.length > 1 }));
});

let failures = 0;
for (const { id, hasCode, hasShaders } of ids) {
  await page.goto(`${base}/#/lesson/${id}`);
  await page.waitForSelector('.learn-pane h1');
  if (!hasCode) {
    console.log(`  -  ${id} (no live code)`);
    continue;
  }
  await page.waitForTimeout(1200);
  const result = await page.evaluate((minColours) => {
    const errors = [...document.querySelectorAll('.log.error, .log.warn')].map((e) => e.textContent);
    const canvas = document.querySelector('#stage canvas');
    if (!canvas) return { errors, drawn: false, why: 'no canvas' };
    // Copy the WebGL canvas into a small 2D canvas and look for variation.
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.drawImage(canvas, 0, 0, 64, 64);
    const px = ctx.getImageData(0, 0, 64, 64).data;
    const seen = new Set();
    let opaque = 0;
    for (let i = 0; i < px.length; i += 4) {
      seen.add(`${px[i] >> 3},${px[i + 1] >> 3},${px[i + 2] >> 3}`);
      if (px[i + 3] > 0) opaque++;
    }
    return { errors, drawn: opaque > 0 && seen.size >= minColours, colours: seen.size };
  }, hasShaders ? 4 : 1); // lesson 1 only clears the screen, so 1 colour is right
  const ok = result.errors.length === 0 && result.drawn && pageErrors.length === 0;
  if (!ok) failures++;
  console.log(`  ${ok ? '✔' : '✖'}  ${id}  (${result.colours ?? 0} distinct colours)`);
  for (const e of [...result.errors, ...pageErrors]) console.log(`       ${e.replace(/\n/g, '\n       ')}`);
  pageErrors.length = 0;
  if (shotDir) await page.screenshot({ path: `${shotDir}/${id}.png` });
}

await browser.close();
if (failures) {
  console.error(`\n${failures} lesson(s) failed`);
  process.exit(1);
}
console.log('\nAll lessons OK');
