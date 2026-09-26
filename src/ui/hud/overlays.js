// HUD overlays: command-AI message toasts, big banners (phases, cascades, abilities, end of run),
// the spotlight tutorial and the pause menu.
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/layout.js';
import { UI, hex } from '../../config/palette.js';
import { RESOURCE_BY_ID } from '../../data/resources.js';
import { textStyle, titleFont } from '../theme.js';
import { panel, Button } from '../components.js';
import { tag } from '../widgets.js';
import { FocusGroup } from '../focus.js';
import { bus } from '../../core/event-bus.js';

export const FREE_CX = 888; // center of the city view between the systems panel and the crisis card

const KIND = {
  analysis: 'violet', warning: 'orange', update: 'teal', adaptive: 'magenta',
  cascade: 'red', forecast: 'cyan', rule: 'orange', ability: 'yellow', info: 'blue'
};

/** Command-AI observations and city alerts, stacked above the bottom edge. */
export class Toasts {
  constructor(scene, { cx = FREE_CX, bottom = GAME_HEIGHT - 16, maxWidth = 940 } = {}) {
    this.scene = scene;
    this.cx = cx;
    this.bottom = bottom;
    this.maxWidth = maxWidth;
    this.items = [];
  }

  push({ kind = 'info', prefix, text }, { hold = 5.5 } = {}) {
    const s = this.scene;
    const c = s.add.container(0, 0).setDepth(40);
    const head = tag(s, 14, 0, prefix || kind.toUpperCase(), { color: KIND[kind] || 'blue', size: 16, height: 32, pad: 10 });
    const t = s.add.text(head.width + 26, 0, text, textStyle({ size: 21, weight: '800', wrap: this.maxWidth - head.width - 50 })).setOrigin(0, 0.5);
    const w = Math.min(this.maxWidth, head.width + t.width + 46);
    const h = Math.max(58, t.height + 22);
    c.add(panel(s, 0, -h / 2, w, h, 'card-white'));
    c.add([head, t]);
    c.x = this.cx - w / 2;
    c.h = h;
    this.items.unshift(c);
    while (this.items.length > 3) this.items.pop().destroy();
    this.layout();
    c.setAlpha(0);
    c.y += 30;
    s.tweens.add({ targets: c, alpha: 1, y: c.y - 30, duration: 240, ease: 'Back.easeOut' });
    s.time.delayedCall(hold * 1000, () => {
      if (!c.active) return;
      s.tweens.add({ targets: c, alpha: 0, duration: 350, onComplete: () => {
        this.items = this.items.filter((x) => x !== c);
        c.destroy();
        this.layout();
      } });
    });
  }

  layout() {
    let y = this.bottom;
    for (const c of this.items) {
      y -= c.h / 2;
      this.scene.tweens.add({ targets: c, y, duration: 200 });
      if (c.y === 0) c.y = y;
      y -= c.h / 2 + 8;
    }
  }
}

/** Big centered banner (phase warnings, ability names, end of run). */
export function banner(scene, { title, text = '', color = 'red', iconFrame = null, duration = 2400, cx = FREE_CX, y = 300, width = 860 }) {
  const c = scene.add.container(cx, y).setDepth(60);
  const h = text ? 136 : 104;
  c.add(panel(scene, -width / 2, -h / 2, width, h, `band-${color}`));
  const light = ['yellow', 'cyan', 'green'].includes(color);
  const tt = scene.add.text(0, text ? -20 : 0, title, textStyle({ size: titleFont(title) === 'body' ? 48 : 54, font: titleFont(title), weight: '900', color: light ? UI.ink : UI.white, stroke: light ? null : UI.ink, strokeThickness: light ? 0 : 10 })).setOrigin(0.5);
  c.add(tt);
  if (iconFrame) {
    const ic = scene.add.image(-tt.width / 2 - 44, tt.y, 'icons', iconFrame).setScale(3);
    c.add(ic);
  }
  if (text) c.add(scene.add.text(0, 38, text, textStyle({ size: 24, weight: '900', color: light ? UI.ink : UI.white, stroke: light ? null : UI.ink, strokeThickness: light ? 0 : 6, align: 'center', wrap: width - 60 })).setOrigin(0.5));
  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  if (duration > 0) scene.tweens.add({ targets: c, alpha: 0, y: y - 40, duration: 400, delay: duration, onComplete: () => c.destroy() });
  return c;
}

/** CASCADE: failing system → the systems it drags down. */
export function cascadeBanner(scene, from, to, { cx = FREE_CX, y = 300 } = {}) {
  const c = scene.add.container(cx, y).setDepth(61);
  const items = [from, ...to.slice(0, 4)];
  const w = 250 + items.length * 90;
  c.add(panel(scene, -w / 2, -76, w, 152, 'band-red'));
  c.add(scene.add.text(0, -40, 'CASCADE!', textStyle({ size: 46, font: 'display', color: UI.white, stroke: UI.ink, strokeThickness: 10 })).setOrigin(0.5));
  let x = -((items.length - 1) * 90 + 60) / 2;
  items.forEach((id, i) => {
    const r = RESOURCE_BY_ID[id];
    c.add(scene.add.image(x, 26, 'ui', `badge-${r.badge}`).setScale(3.4));
    c.add(scene.add.image(x, 25, 'icons', r.icon).setScale(2.4));
    if (i === 0) {
      c.add(scene.add.image(x + 45, 26, 'icons', 'ui-cascade').setScale(1.8));
      x += 110;
    } else {
      x += 80;
    }
  });
  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 240, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: c, x: cx + 6, duration: 60, yoyo: true, repeat: 5, delay: 240 });
  scene.tweens.add({ targets: c, alpha: 0, y: y - 40, duration: 400, delay: 2600, onComplete: () => c.destroy() });
  return c;
}

/**
 * SHORT TUTORIAL: four spotlight steps on the real HUD. Auto-advances in Exhibition Mode.
 */
export class Tutorial {
  constructor(scene, steps, { portrait, color, auto = 0, onDone }) {
    this.scene = scene;
    this.steps = steps;
    this.portrait = portrait;
    this.color = color;
    this.auto = auto;
    this.onDone = onDone;
    this.index = -1;
    this.layer = scene.add.container(0, 0).setDepth(900);
    this.focus = new FocusGroup(scene, { onCancel: () => this.finish() });
    this.next();
  }

  next() {
    this.index++;
    if (this.index >= this.steps.length) {
      this.finish();
      return;
    }
    this.render(this.steps[this.index]);
    this.timer?.remove();
    if (this.auto > 0) this.timer = this.scene.time.delayedCall(this.auto * 1000, () => this.next());
  }

  render(step) {
    const s = this.scene;
    this.layer.removeAll(true);
    this.focus.clear();
    const { x, y, w, h } = step.target;
    const veil = hex(UI.ink);
    const a = 0.72;
    // four rectangles around the spotlight so the target stays bright and clickable-looking
    this.layer.add(s.add.rectangle(0, 0, GAME_WIDTH, y, veil, a).setOrigin(0).setInteractive());
    this.layer.add(s.add.rectangle(0, y + h, GAME_WIDTH, GAME_HEIGHT - y - h, veil, a).setOrigin(0).setInteractive());
    this.layer.add(s.add.rectangle(0, y, x, h, veil, a).setOrigin(0).setInteractive());
    this.layer.add(s.add.rectangle(x + w, y, GAME_WIDTH - x - w, h, veil, a).setOrigin(0).setInteractive());
    const ring = panel(s, x - 12, y - 12, w + 24, h + 24, 'select-gold');
    this.layer.add(ring);
    s.tweens.add({ targets: ring, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });

    // speech card next to the target
    const cw = 660;
    const ch = 250;
    const cx = Math.min(GAME_WIDTH - cw - 30, Math.max(30, step.cardX ?? (x + w + 40)));
    const cy = Math.min(GAME_HEIGHT - ch - 30, Math.max(30, step.cardY ?? y));
    const card = s.add.container(cx, cy);
    card.add(panel(s, 0, 0, cw, ch, 'card-white'));
    card.add(s.add.image(76, 84, 'ui', `badge-${this.color}`).setScale(6.6));
    card.add(s.add.image(76, 86, 'portraits', this.portrait).setScale(2));
    card.add(s.add.text(150, 26, step.title, textStyle({ size: 30, font: titleFont(step.title), weight: '900', color: UI.violetDeep })));
    card.add(s.add.text(150, 70, step.text, textStyle({ size: 21, weight: '800', wrap: cw - 170, lineSpacing: -1 })));
    card.add(s.add.text(24, ch - 36, `${this.index + 1} / ${this.steps.length}`, textStyle({ size: 20, weight: '900', color: UI.inkSoft })).setOrigin(0, 0.5));
    const last = this.index === this.steps.length - 1;
    const next = new Button(s, cw - 130, ch - 40, { text: last ? 'START' : 'NEXT', width: 220, height: 64, color: 'teal', iconFrame: last ? 'ui-play' : null, size: 28, onClick: () => this.next() });
    const skip = new Button(s, cw - 340, ch - 40, { text: 'SKIP', width: 160, height: 64, color: 'stone', size: 26, sfx: 'back', onClick: () => this.finish() });
    card.add([skip, next]);
    this.focus.add(skip);
    this.focus.add(next);
    this.focus.focusItem(next);
    this.layer.add(card);
    card.setAlpha(0);
    s.tweens.add({ targets: card, alpha: 1, y: { from: cy + 20, to: cy }, duration: 220 });
    bus.emit('sfx', 'tick');
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.timer?.remove();
    this.focus.destroy();
    this.layer.destroy();
    this.onDone?.();
  }
}

/** Pause menu (Esc). */
export class PauseMenu {
  constructor(scene, { onResume, onRestart, onSettings, onQuit }) {
    const s = scene;
    this.layer = s.add.container(0, 0).setDepth(950);
    this.layer.add(s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, hex(UI.ink), 0.66).setOrigin(0).setInteractive());
    const w = 560;
    const h = 560;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    this.layer.add(panel(s, x, y, w, h, 'card-white'));
    this.layer.add(panel(s, x, y, w, 86, 'band-violet'));
    this.layer.add(s.add.text(GAME_WIDTH / 2, y + 43, 'PAUSED', textStyle({ size: 46, font: 'display', color: UI.white, stroke: UI.ink, strokeThickness: 8 })).setOrigin(0.5));
    this.focus = new FocusGroup(s, { onCancel: () => onResume() });
    const mk = (i, text, color, iconFrame, fn) => {
      const b = new Button(s, GAME_WIDTH / 2, y + 160 + i * 100, { text, width: 440, height: 80, color, iconFrame, size: 30, onClick: fn });
      this.layer.add(b);
      this.focus.add(b);
      return b;
    };
    mk(0, 'RESUME', 'teal', 'ui-play', onResume);
    mk(1, 'RESTART', 'orange', 'ui-restart', onRestart);
    mk(2, 'SETTINGS', 'blue', 'ui-gear', onSettings);
    mk(3, 'QUIT TO TITLE', 'stone', 'ui-home', onQuit);
    this.focus.focus(0);
  }

  destroy() {
    this.focus.destroy();
    this.layer.destroy();
  }
}
