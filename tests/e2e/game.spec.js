// End-to-end: the real game in a browser, from boot to the final report.
import { test, expect } from '@playwright/test';

const scenes = (page) => page.evaluate(() => window.__NEXUS__?.activeScenes() || []);
const waitScene = (page, key) => page.waitForFunction((k) => window.__NEXUS__?.activeScenes().includes(k), key, { timeout: 60000 });

/** Collects console errors, page errors and failed asset requests for every test. */
function watch(page) {
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
  return problems;
}

async function boot(page, query = '') {
  await page.goto(`/?test${query}`);
  await waitScene(page, query.includes('start=') ? query.match(/start=(\w+)/)[1] : 'title');
}

/** Advance the simulation until a crisis card is open. */
async function openCrisis(page) {
  return page.evaluate(() => {
    const n = window.__NEXUS__;
    n.run.started = true;
    for (let i = 0; i < 800 && !n.sim.activeEvent; i++) n.sim.update(0.1);
    return n.sim.activeEvent?.id;
  });
}

test.beforeEach(async ({ page }) => {
  // start every test with an empty profile, but keep it across reloads within the test
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('nexus-test-cleared')) {
        localStorage.clear();
        sessionStorage.setItem('nexus-test-cleared', '1');
      }
    } catch { /* storage unavailable: the game falls back to memory */ }
  });
});

test('boots to the title screen with every asset loaded and no errors', async ({ page }) => {
  const problems = watch(page);
  await boot(page);
  expect(await scenes(page)).toEqual(['title']);
  const textures = await page.evaluate(() => ['ground', 'water', 'city', 'buildings', 'people', 'portraits', 'effects', 'icons', 'ui', 'clouds', 'sky', 'vignettes'].filter((k) => !window.__NEXUS__.game.textures.exists(k)));
  expect(textures).toEqual([]);
  expect(problems).toEqual([]);
});

test('mouse: title → role → crisis → tutorial → first decision', async ({ page }) => {
  const problems = watch(page);
  await boot(page);
  await page.mouse.click(960, 650); // PLAY
  await waitScene(page, 'character');
  await page.mouse.click(692, 852); // Engineer → SELECT
  await waitScene(page, 'scenario');
  await page.mouse.click(960, 300); // focus Water Crisis
  await page.mouse.click(1690, 1020); // START
  await waitScene(page, 'hud');
  const cfg = await page.evaluate(() => window.__NEXUS__.sim.config);
  expect(cfg.character).toBe('engineer');
  expect(cfg.scenario).toBe('water');
  // tutorial: four steps, then the run starts
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  expect(await page.evaluate(() => window.__NEXUS__.run.started)).toBe(true);
  const crisis = await openCrisis(page);
  expect(crisis).toBeTruthy();
  await page.keyboard.press('Digit1');
  await page.waitForTimeout(300);
  const decisions = await page.evaluate(() => window.__NEXUS__.sim.decisions.map((d) => ({ id: d.eventId, choice: d.choiceId, ignored: d.ignored })));
  expect(decisions.length).toBe(1);
  expect(decisions[0].ignored).toBe(false);
  expect(problems).toEqual([]);
});

test('keyboard only: menus and gameplay work without a mouse', async ({ page }) => {
  const problems = watch(page);
  await boot(page);
  await page.keyboard.press('Enter'); // PLAY is focused
  await waitScene(page, 'character');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter'); // third role
  await waitScene(page, 'scenario');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter'); // second theme
  await waitScene(page, 'hud');
  const cfg = await page.evaluate(() => window.__NEXUS__.sim.config);
  expect(cfg.character).toBe('engineer');
  expect(cfg.scenario).toBe('weather');
  await page.keyboard.press('Escape'); // skip tutorial
  await openCrisis(page);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__NEXUS__.sim.decisions.length)).toBe(1);
  await page.keyboard.press('KeyE'); // special ability
  expect(await page.evaluate(() => window.__NEXUS__.sim.ability.uses)).toBe(1);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__NEXUS__.run.paused)).toBe(true);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__NEXUS__.run.paused)).toBe(false);
  expect(problems).toEqual([]);
});

test('random character reveal, chaos mode and randomize everything build real runs', async ({ page }) => {
  const problems = watch(page);
  await boot(page, '&start=character');
  await page.mouse.click(960, 1028); // RANDOM CHARACTER
  await page.waitForFunction(() => window.__NEXUS__.scene('character').children.list.some((o) => o.depth === 100), null, { timeout: 30000 });
  await page.waitForTimeout(12000); // roulette + reveal animation
  await page.keyboard.press('Enter'); // CONTINUE (focused)
  await waitScene(page, 'scenario');
  const role = await page.evaluate(() => window.__NEXUS__.scene('scenario').children.list.length > 0);
  expect(role).toBe(true);
  await page.mouse.click(1250, 1020); // CHAOS MODE
  await page.waitForTimeout(9000);
  await page.keyboard.press('Enter'); // START
  await waitScene(page, 'hud');
  const chaos = await page.evaluate(() => window.__NEXUS__.sim.config);
  expect(chaos.chaos).toBe(true);
  expect(chaos.scenarioIds.length).toBe(2);
  expect(chaos.twist).toBeTruthy();

  await page.goto('/?test');
  await waitScene(page, 'title');
  await page.mouse.click(960, 770); // RANDOMIZE EVERYTHING
  await page.waitForTimeout(9000);
  await page.keyboard.press('Enter');
  await waitScene(page, 'hud');
  const rnd = await page.evaluate(() => window.__NEXUS__.sim.config);
  expect(rnd.randomized).toBe(true);
  expect(rnd.twist).toBeTruthy();
  expect(problems).toEqual([]);
});

test('a full run reaches the report, timeline and What-If without changing the score', async ({ page }) => {
  const problems = watch(page);
  await boot(page, '&start=game');
  await waitScene(page, 'hud');
  await page.keyboard.press('Escape'); // skip tutorial
  const end = await page.evaluate(() => window.__NEXUS__.fastForward(400, 'expert'));
  expect(end.ended).toBe(true);
  await waitScene(page, 'results');
  const report = await page.evaluate(() => {
    const r = window.__NEXUS__.scene('results').report;
    return { survival: r.survival, decisions: r.decisionsMade + r.decisionsMissed, style: r.style.name, systems: Object.keys(r.systems).length };
  });
  expect(report.survival).toBeGreaterThanOrEqual(0);
  expect(report.survival).toBeLessThanOrEqual(100);
  expect(report.decisions).toBeGreaterThan(5);
  expect(report.systems).toBe(8);
  expect(report.style.length).toBeGreaterThan(5);

  // saved to the local scoreboard
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('nexus-city-zero:profile')));
  expect(saved.stats.runs).toBe(1);
  expect(saved.boards.survival[0].value).toBe(report.survival);

  await page.mouse.click(290, 1012); // TIMELINE & WHAT-IF
  await waitScene(page, 'timeline');
  const before = await page.evaluate(() => JSON.stringify(window.__NEXUS__.game.scene.getScene('results').report));
  // click the first alternative that was affordable at the time (the run is random)
  const alt = await page.evaluate(() => {
    const b = window.__NEXUS__.scene('timeline').detailButtons.find((x) => !x.disabled);
    return { x: b.x, y: b.y };
  });
  await page.mouse.click(alt.x, alt.y);
  await page.waitForTimeout(800);
  const shown = await page.evaluate(() => window.__NEXUS__.scene('timeline').whatIfLayer.list.length);
  expect(shown).toBeGreaterThan(10);
  const after = await page.evaluate(() => JSON.stringify(window.__NEXUS__.game.scene.getScene('results').report));
  expect(after).toBe(before);
  expect(problems).toEqual([]);
});

test('the scoreboard and settings persist across reloads; RESET returns to the title', async ({ page }) => {
  const problems = watch(page);
  await boot(page, '&start=game');
  await waitScene(page, 'hud');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__NEXUS__.fastForward(400, 'greedy'));
  await waitScene(page, 'results');
  const survival = await page.evaluate(() => window.__NEXUS__.scene('results').report.survival);
  await page.mouse.click(1660, 1012); // RESET
  await waitScene(page, 'title');
  expect(await page.evaluate(() => window.__NEXUS__.session.report)).toBe(null);

  // settings: toggle mute and reduced motion
  await page.mouse.click(1150, 890);
  await waitScene(page, 'settings');
  await page.mouse.click(960, 510);
  await page.mouse.click(960, 600);
  await page.mouse.click(1150, 920); // DONE
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('nexus-city-zero:profile')).settings);
  expect(settings.muted).toBe(true);
  expect(settings.reducedMotion).toBe(true);

  // reload: the Hall of Commanders still lists the run, settings are kept
  await page.goto('/?test&start=hall');
  await waitScene(page, 'hall');
  const hall = await page.evaluate(() => {
    const p = window.__NEXUS__.scene('hall').profile;
    return { top: p.boards.survival[0]?.value, runs: p.stats.runs, muted: p.settings.muted };
  });
  expect(hall).toEqual({ top: survival, runs: 1, muted: true });
  expect(problems).toEqual([]);
});

test('exhibition mode: idle title starts the attract demo; any input returns', async ({ page }) => {
  const problems = watch(page);
  await boot(page, '&exhibition');
  await page.evaluate(() => { window.__NEXUS__.scene('title').idle.left = 0.05; });
  await waitScene(page, 'hud');
  expect(await page.evaluate(() => window.__NEXUS__.run.demo)).toBe(true);
  await page.waitForTimeout(1500);
  await page.keyboard.press('Space');
  await waitScene(page, 'title');
  expect(problems).toEqual([]);
});

for (const [w, h] of [[1280, 720], [3840, 2160], [1024, 1366]]) {
  test(`scales to a ${w}×${h} screen without distortion`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize({ width: w, height: h });
    await boot(page);
    const box = await page.locator('canvas').boundingBox();
    expect(box.width).toBeLessThanOrEqual(w + 1);
    expect(box.height).toBeLessThanOrEqual(h + 1);
    expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.01);
    expect(Math.max(box.width / w, box.height / h)).toBeGreaterThan(0.99); // fills one dimension
    expect(problems).toEqual([]);
  });
}
