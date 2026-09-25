// Visual QA: open the game at 1920×1080 in Chromium, optionally run steps, save screenshots,
// and print console errors. Usage:
//   node tools/qa/shot.mjs --url http://localhost:5173/?test --out shot.png [--wait title]
//        [--steps steps.json] [--width 1920 --height 1080]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, [])
);
const url = args.url || 'http://localhost:5173/?test';
const out = args.out || 'shot.png';
const width = Number(args.width || 1920);
const height = Number(args.height || 1080);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: 'load' });
const waitScene = args.wait || 'title';
await page.waitForFunction((key) => window.__NEXUS__?.activeScenes().includes(key), waitScene, { timeout: 30000 });
await page.waitForTimeout(Number(args.delay || 800));

if (args.steps) {
  const steps = JSON.parse(readFileSync(args.steps, 'utf8'));
  let n = 0;
  for (const s of steps) {
    if (s.click) await page.mouse.click(s.click[0], s.click[1]);
    if (s.key) await page.keyboard.press(s.key);
    if (s.eval) await page.evaluate(s.eval);
    if (s.waitScene) await page.waitForFunction((key) => window.__NEXUS__?.activeScenes().includes(key), s.waitScene, { timeout: 30000 });
    if (s.wait) await page.waitForTimeout(s.wait);
    if (s.shot) { await page.screenshot({ path: s.shot }); n++; }
  }
  console.log(`steps done, ${n} step screenshots`);
}
await page.screenshot({ path: out });
const errs = await page.evaluate(() => window.__NEXUS__?.errors || []);
console.log('active scenes:', await page.evaluate(() => window.__NEXUS__?.activeScenes()));
console.log(logs.length || errs.length ? [...logs, ...errs].join('\n') : 'no console errors');
await browser.close();
