// Slot-machine reveal for 🎲 RANDOMIZE EVERYTHING and 🎲 CHAOS MODE: each reel spins through the
// real options and lands on what the seeded run setup picked, so the randomness is visible.
import { GAME_WIDTH, GAME_HEIGHT } from '../config/layout.js';
import { UI, hex } from '../config/palette.js';
import { CHARACTERS, CHARACTER_BY_ID } from '../data/characters.js';
import { SCENARIOS, SCENARIO_BY_ID, CHAOS_TWISTS } from '../data/scenarios.js';
import { EVENT_BY_ID } from '../data/events/index.js';
import { textStyle } from './theme.js';
import { panel, Button } from './components.js';
import { confetti, tag } from './widgets.js';
import { FocusGroup } from './focus.js';
import { bus } from '../core/event-bus.js';

const TWIST_ICON = {
  'double-trouble': 'ui-warning', 'fragile-grid': 'res-energy', 'blind-spots': 'res-communication',
  'rush-hour': 'res-transport', 'tight-budget': 'res-budget', aftershocks: 'ui-cascade'
};

function reelFor(kind) {
  if (kind === 'role') return CHARACTERS.map((c) => ({ atlas: 'portraits', frame: c.portrait, scale: 3, label: c.name.toUpperCase(), color: c.color }));
  if (kind === 'theme') return SCENARIOS.filter((s) => !s.chaos).map((s) => ({ atlas: 'icons', frame: s.icon, scale: 5, label: s.name.toUpperCase(), color: s.color }));
  return CHAOS_TWISTS.map((t) => ({ atlas: 'icons', frame: TWIST_ICON[t.id] || 'ui-dice', scale: 6, label: t.name.toUpperCase(), color: 'magenta', text: t.text }));
}

/**
 * @param {Phaser.Scene} scene
 * @param {object} config run config (from run-setup)
 * @param {{title: string, onStart: Function, onCancel?: Function, auto?: number}} opts
 */
export function showRunReveal(scene, config, { title, onStart, onCancel = null, auto = 0 }) {
  const layer = scene.add.container(0, 0).setDepth(5000);
  const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, hex(UI.ink), 0.72).setOrigin(0).setInteractive();
  layer.add(veil);
  const W = 1240;
  const H = 700;
  const x0 = (GAME_WIDTH - W) / 2;
  const y0 = (GAME_HEIGHT - H) / 2;
  layer.add(panel(scene, x0, y0, W, H, 'card-white'));
  layer.add(panel(scene, x0, y0, W, 96, 'band-magenta'));
  layer.add(scene.add.image(x0 + 60, y0 + 46, 'icons', 'ui-dice').setScale(3));
  layer.add(scene.add.text(x0 + 104, y0 + 46, title, textStyle({ size: 46, font: 'display', color: UI.white, stroke: UI.ink, strokeThickness: 8 })).setOrigin(0, 0.5));

  // What the reels land on
  const role = CHARACTER_BY_ID[config.character];
  const themes = config.scenarioIds.map((id) => SCENARIO_BY_ID[id]);
  const twist = CHAOS_TWISTS.find((t) => t.id === config.twist);
  const reels = config.chaos && title.includes('CHAOS')
    ? [
        { head: 'CRISIS 1', kind: 'theme', land: themes[0].id },
        { head: 'CRISIS 2', kind: 'theme', land: themes[1].id },
        { head: 'TWIST', kind: 'twist', land: config.twist }
      ]
    : [
        { head: 'ROLE', kind: 'role', land: role.id },
        { head: config.chaos ? 'CHAOS MODE' : 'CRISIS', kind: 'theme', land: themes[0].id },
        { head: 'CONDITION', kind: 'twist', land: config.twist }
      ];

  const slotW = 340;
  const gap = 40;
  const sx = x0 + (W - (slotW * 3 + gap * 2)) / 2;
  const slots = reels.map((r, i) => {
    const items = reelFor(r.kind);
    const landIndex = items.findIndex((it) => it.label === (r.kind === 'role' ? CHARACTER_BY_ID[r.land].name : r.kind === 'theme' ? SCENARIO_BY_ID[r.land].name : CHAOS_TWISTS.find((t) => t.id === r.land).name).toUpperCase());
    const x = sx + i * (slotW + gap);
    const y = y0 + 130;
    layer.add(scene.add.text(x + slotW / 2, y + 8, r.head, textStyle({ size: 24, weight: '900', color: UI.inkSoft })).setOrigin(0.5, 0));
    const frame = panel(scene, x, y + 46, slotW, 250, 'card-inset');
    const img = scene.add.image(x + slotW / 2, y + 171, items[0].atlas, items[0].frame).setScale(items[0].scale);
    const name = scene.add.text(x + slotW / 2, y + 322, '', textStyle({ size: 26, weight: '900', align: 'center', wrap: slotW - 20 })).setOrigin(0.5, 0);
    layer.add([frame, img, name]);
    return { r, items, landIndex: Math.max(0, landIndex), img, name, x, y, index: 0, stopped: false };
  });

  // Details of the generated run
  const opening = EVENT_BY_ID[config.opening];
  const detail = [
    `Emergency budget ${config.budget}`,
    opening ? `First crisis: ${opening.title}` : null,
    twist ? `${twist.name}: ${twist.text}` : null
  ].filter(Boolean).join('   ·   ');
  const detailText = scene.add.text(GAME_WIDTH / 2, y0 + 520, detail, textStyle({ size: 22, weight: '800', align: 'center', wrap: W - 80, color: UI.inkSoft })).setOrigin(0.5, 0).setAlpha(0);
  layer.add(detailText);

  const focus = new FocusGroup(scene, { onCancel: onCancel ? () => { close(); onCancel(); } : null });
  const start = new Button(scene, GAME_WIDTH / 2 + (onCancel ? 150 : 0), y0 + H - 62, { text: 'START', width: 300, height: 84, color: 'teal', iconFrame: 'ui-play', size: 36, onClick: () => { close(); onStart(); } });
  start.setAlpha(0).setVisible(false);
  layer.add(start);
  let back = null;
  if (onCancel) {
    back = new Button(scene, GAME_WIDTH / 2 - 190, y0 + H - 62, { text: 'BACK', width: 220, height: 84, color: 'stone', size: 32, sfx: 'back', onClick: () => { close(); onCancel(); } });
    layer.add(back);
    focus.add(back);
  }

  // Spin: every reel ticks through its items, then stops one after another, slowing down.
  let t = 0;
  const stopAt = [1.1, 1.8, 2.5];
  const timer = scene.time.addEvent({
    delay: 70,
    loop: true,
    callback: () => {
      t += 0.07;
      let running = 0;
      slots.forEach((s, i) => {
        if (s.stopped) return;
        running++;
        const remaining = stopAt[i] - t;
        if (remaining <= 0) {
          s.stopped = true;
          const it = s.items[s.landIndex];
          s.img.setTexture(it.atlas, it.frame).setScale(it.scale);
          s.name.setText(it.label);
          scene.tweens.add({ targets: s.img, scale: { from: it.scale * 1.35, to: it.scale }, duration: 360, ease: 'Back.easeOut' });
          bus.emit('sfx', 'reveal');
          return;
        }
        // slow down near the stop
        if (remaining < 0.5 && Math.random() < 0.45) return;
        s.index = (s.index + 1) % s.items.length;
        const it = s.items[s.index];
        s.img.setTexture(it.atlas, it.frame).setScale(it.scale);
        s.name.setText('');
        bus.emit('sfx', 'tick');
      });
      if (!running) {
        timer.remove();
        confetti(scene, GAME_WIDTH / 2, y0 + 250, { count: 50, depth: 5001 });
        scene.tweens.add({ targets: detailText, alpha: 1, duration: 300 });
        start.setVisible(true);
        scene.tweens.add({ targets: start, alpha: 1, duration: 250 });
        focus.add(start);
        focus.focusItem(start);
        if (auto > 0) scene.time.delayedCall(auto * 1000, () => { if (layer.active) start.activate(); });
      }
    }
  });
  bus.emit('sfx', 'dice');

  function close() {
    timer.remove();
    focus.destroy();
    layer.destroy();
  }

  if (config.chaos && !title.includes('CHAOS')) {
    const chaosTag = tag(scene, x0 + W - 40, y0 + 48, 'CHAOS MODE', { color: 'yellow', size: 22 });
    chaosTag.x -= chaosTag.width;
    layer.add(chaosTag);
  }
  return { layer, close };
}
