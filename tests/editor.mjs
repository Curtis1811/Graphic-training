// Editor alignment test: the caret (a transparent <textarea>) must stay exactly on
// top of the highlighted code after scrolling, typing and drag-selecting.
// Clicks specific lines/columns and checks where the caret and typed text land.
//
//   npm run serve   (in another terminal)
//   npm run test:editor
import { createRequire } from 'node:module';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://localhost:8080';
async function run(label, ctxOpts) {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage();
  await p.goto(`${base}/#/lesson/lighting`); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('.mobile-tabs button[data-view=code]')?.click()); await p.waitForTimeout(400);
  let fails = 0;
  const info = () => p.evaluate(() => {
    const ta = document.querySelector('.ed-input'), hl = document.querySelector('.ed-hl'), ed = document.querySelector('.editor');
    const before = ta.value.slice(0, ta.selectionStart).split('\n');
    return { taScroll: ta.scrollTop + ta.scrollLeft, edScroll: [ed.scrollLeft, ed.scrollTop], line: before.length, col: before.at(-1).length,
      edRect: ed.getBoundingClientRect().toJSON(), hlRect: hl.getBoundingClientRect().toJSON(),
      pad: parseFloat(getComputedStyle(hl).paddingTop), padL: parseFloat(getComputedStyle(hl).paddingLeft),
      lh: parseFloat(getComputedStyle(hl).lineHeight), cw: (() => { const s = document.createElement('span'); s.textContent = 'x'.repeat(100); hl.append(s); const w = s.getBoundingClientRect().width / 100; s.remove(); return w; })() };
  });
  const clickAt = async (line, col, tag) => {
    const i = await info();
    const y = i.hlRect.top + i.pad + (line - 1) * i.lh + i.lh / 2;
    const x = i.hlRect.left + i.padL + col * i.cw + 1;
    if (y < i.edRect.top || y > i.edRect.bottom) { console.log(`  ${tag}: line ${line} not visible, skipped`); return; }
    await p.mouse.click(x, y);
    const j = await info();
    const len = await p.evaluate((n) => document.querySelector('.ed-input').value.split('\n')[n - 1].length, line);
    const want = Math.min(col, len); // clicking past the end of a short line puts the caret at its end
    const ok = j.line === line && j.col === want && j.taScroll === 0;
    if (!ok) fails++;
    console.log(`  ${ok ? 'ok ' : 'BAD'} ${tag}: clicked line ${line} col ${col} -> caret line ${j.line} col ${j.col} (want ${want}), textarea self-scroll ${j.taScroll}, editor scroll ${j.edScroll}`);
  };
  console.log(label);
  await clickAt(3, 4, 'fresh');
  await p.keyboard.press('Control+Home');
  for (let i = 0; i < 45; i++) await p.keyboard.press('ArrowDown');
  await p.keyboard.press('End'); for (let i = 0; i < 4; i++) await p.keyboard.press('Enter');
  await p.keyboard.type('const typed = 1;');
  let i = await info(); console.log(`  after 45x Down + typing: caret line ${i.line}, textarea self-scroll ${i.taScroll}, editor scroll ${i.edScroll}`);
  if (i.taScroll) fails++;
  const visTop = Math.ceil((i.edRect.top - i.hlRect.top - i.pad) / i.lh) + 2;
  await clickAt(visTop, 2, 'after scrolling');
  await clickAt(visTop + 3, 10, 'after scrolling');
  // typed text lands where clicked?
  await p.keyboard.type('@@');
  const where = await p.evaluate(() => document.querySelector('.ed-input').value.split('\n').findIndex((l) => l.includes('@@')) + 1);
  console.log(`  ${where === visTop + 3 ? 'ok ' : 'BAD'} typed '@@' appeared on line ${where} (expected ${visTop + 3})`); if (where !== visTop + 3) fails++;
  // drag-select past the bottom edge, then click
  const e = (await info()).edRect;
  await p.mouse.move(e.x + 200, e.y + 60); await p.mouse.down(); await p.mouse.move(e.x + 260, e.y + e.height + 50, { steps: 8 }); await p.waitForTimeout(500); await p.mouse.up();
  i = await info(); console.log(`  after drag past bottom: textarea self-scroll ${i.taScroll}, editor scroll ${i.edScroll}`); if (i.taScroll) fails++;
  const vt = Math.ceil((i.edRect.top - i.hlRect.top - i.pad) / i.lh) + 2;
  await clickAt(vt, 5, 'after drag');
  await b.close();
  return fails;
}
{
  let f = await run('DESKTOP', { viewport: { width: 1400, height: 900 } });
  f += await run('PHONE', { ...devices['Pixel 7'] });
  console.log(f ? `\n${f} FAILURES` : '\nALL OK');
  process.exit(f ? 1 : 0);
}
