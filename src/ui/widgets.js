// Small reusable UI widgets built on the pixel UI kit: tags, stars, toggles, sliders, badges,
// floating numbers and celebratory bursts.
import Phaser from 'phaser';
import { PX } from '../config/layout.js';
import { UI } from '../config/palette.js';
import { RESOURCE_BY_ID } from '../data/resources.js';
import { textStyle } from './theme.js';
import { panel } from './components.js';
import { bus } from '../core/event-bus.js';

/** Colored label capsule, e.g. [CASCADE] or [GOVERNOR ONLY]. */
export function tag(scene, x, y, text, { color = 'violet', size = 18, iconFrame = null, textColor = null, pad = 14, height = 36 } = {}) {
  const c = scene.add.container(x, y);
  const light = ['yellow', 'cyan', 'green', 'coral', 'blue'].includes(color);
  const t = scene.add.text(0, 0, text, textStyle({ size, weight: '900', color: textColor || (light ? UI.ink : UI.white) })).setOrigin(0, 0.5);
  let ix = pad;
  let ic = null;
  if (iconFrame) {
    ic = scene.add.image(0, 0, 'icons', iconFrame).setScale(2);
    ic.setPosition(pad + ic.displayWidth / 2, -1);
    ix = pad + ic.displayWidth + 8;
  }
  t.setX(ix);
  const w = ix + t.width + pad;
  const bg = panel(scene, 0, -height / 2, w, height, `band-${color}`);
  c.add(ic ? [bg, ic, t] : [bg, t]);
  c.width = w;
  c.height = height;
  c.label = t;
  return c;
}

/** Row of difficulty stars (filled + dim). */
export function stars(scene, x, y, n, max = 5, { scale = 2, gap = 4 } = {}) {
  const c = scene.add.container(x, y);
  for (let i = 0; i < max; i++) {
    const s = scene.add.image(0, 0, 'icons', 'ui-star').setScale(scale).setOrigin(0, 0.5);
    s.x = i * (s.displayWidth + gap);
    if (i >= n) s.setTint(0x9a8fb0).setAlpha(0.45);
    c.add(s);
  }
  c.width = max * (16 * scale + gap) - gap;
  return c;
}

/** Row of system badges (icon on a colored circle). */
export function systemBadges(scene, x, y, systems, { scale = 2.5, gap = 8 } = {}) {
  const c = scene.add.container(x, y);
  let cx = 0;
  for (const id of systems) {
    const r = RESOURCE_BY_ID[id];
    const b = scene.add.image(cx, 0, 'ui', `badge-${r.badge}`).setScale(scale).setOrigin(0, 0.5);
    const ic = scene.add.image(cx + b.displayWidth / 2, -1, 'icons', r.icon).setScale(scale - 0.5);
    c.add([b, ic]);
    cx += b.displayWidth + gap;
  }
  c.width = cx - gap;
  return c;
}

/**
 * Pill toggle (ON/OFF) that works with FocusGroup (setFocus/activate/hover) and pointer input.
 */
export class Toggle extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { text, value = false, width = 520, height = 76, onChange = null, hint = null }) {
    super(scene, x, y);
    this.value = value;
    this.onChange = onChange;
    this.w = width;
    this.h = height;
    this.bg = panel(scene, -width / 2, -height / 2, width, height, 'card-white');
    this.focusRing = panel(scene, -width / 2 - 12, -height / 2 - 12, width + 24, height + 24, 'select-gold').setVisible(false);
    this.label = scene.add.text(-width / 2 + 24, hint ? -12 : 0, text, textStyle({ size: 26, weight: '900' })).setOrigin(0, 0.5);
    this.add([this.focusRing, this.bg, this.label]);
    if (hint) this.add(scene.add.text(-width / 2 + 24, 18, hint, textStyle({ size: 17, weight: '700', color: UI.inkSoft })).setOrigin(0, 0.5));
    this.pill = panel(scene, width / 2 - 150, -22, 126, 44, 'btn-stone');
    this.pillText = scene.add.text(width / 2 - 87, -2, '', textStyle({ size: 22, weight: '900', color: UI.white, stroke: UI.ink, strokeThickness: 5 })).setOrigin(0.5);
    this.add([this.pill, this.pillText]);
    this.setSize(width, height);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => this.emit('hover', this));
    this.bg.on('pointerup', () => this.activate());
    this.render();
    scene.add.existing(this);
  }

  render() {
    this.pill.setFrame(this.value ? 'btn-green' : 'btn-stone');
    this.pillText.setText(this.value ? 'ON' : 'OFF');
  }

  setValue(v) {
    this.value = v;
    this.render();
  }

  setFocus(on) {
    this.focusRing.setVisible(on);
  }

  activate() {
    this.value = !this.value;
    this.render();
    bus.emit('sfx', 'toggle');
    this.onChange?.(this.value);
  }
}

/** Volume slider 0..1 with 10 steps: click the track, or focus it and press ←/→ (Enter steps up). */
export class Slider extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { text, value = 0.8, width = 520, height = 76, onChange = null }) {
    super(scene, x, y);
    this.value = value;
    this.onChange = onChange;
    this.bg = panel(scene, -width / 2, -height / 2, width, height, 'card-white');
    this.focusRing = panel(scene, -width / 2 - 12, -height / 2 - 12, width + 24, height + 24, 'select-gold').setVisible(false);
    this.label = scene.add.text(-width / 2 + 24, 0, text, textStyle({ size: 24, weight: '900' })).setOrigin(0, 0.5);
    this.trackX = -width / 2 + 270;
    this.trackW = width - 270 - 110;
    this.track = panel(scene, this.trackX, -12, this.trackW, 24, 'bar-track');
    this.fill = panel(scene, this.trackX + PX * 2, -12 + PX * 2, 30, 24 - PX * 4, 'bar-teal');
    this.valueText = scene.add.text(width / 2 - 20, 0, '', textStyle({ size: 24, weight: '900' })).setOrigin(1, 0.5);
    this.add([this.focusRing, this.bg, this.label, this.track, this.fill, this.valueText]);
    this.setSize(width, height);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => this.emit('hover', this));
    this.bg.on('pointerdown', (p) => this.pointerSet(p));
    this.render();
    scene.add.existing(this);
  }

  /** Called by FocusGroup before it handles navigation keys. */
  handleKey(e) {
    if (e.code !== 'ArrowLeft' && e.code !== 'ArrowRight') return false;
    this.set(this.value + (e.code === 'ArrowRight' ? 0.1 : -0.1));
    return true;
  }

  pointerSet(pointer) {
    const local = pointer.x - this.getWorldTransformMatrix().tx;
    if (local < this.trackX - 20) return;
    this.set((local - this.trackX) / this.trackW);
  }

  set(v) {
    this.value = Math.round(Phaser.Math.Clamp(v, 0, 1) * 10) / 10;
    this.render();
    bus.emit('sfx', 'tick');
    this.onChange?.(this.value);
  }

  render() {
    const inner = this.trackW - PX * 4;
    const px = Math.max(24, inner * this.value);
    this.fill.setVisible(this.value > 0.02);
    this.fill.setSize(Math.round(px / PX), this.fill.height);
    this.valueText.setText(`${Math.round(this.value * 100)}%`);
  }

  setFocus(on) {
    this.focused = on;
    this.focusRing.setVisible(on);
  }

  activate() {
    this.set(this.value >= 1 ? 0 : this.value + 0.1);
  }
}

/** Number that floats up and fades (effect feedback). */
export function floatText(scene, x, y, text, { color = UI.white, size = 30, rise = 70, duration = 1300, stroke = UI.ink, delay = 0 } = {}) {
  const t = scene.add.text(x, y, text, textStyle({ size, weight: '900', color, stroke, strokeThickness: 7 })).setOrigin(0.5).setAlpha(0);
  scene.tweens.add({ targets: t, alpha: 1, duration: 140, delay });
  scene.tweens.add({ targets: t, y: y - rise, duration, delay, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: t, alpha: 0, duration: 400, delay: delay + duration - 400, onComplete: () => t.destroy() });
  return t;
}

/** Confetti burst from the effects atlas. */
export function confetti(scene, x, y, { count = 40, spread = 520, depth = 1000 } = {}) {
  const frames = ['confetti-0', 'confetti-1', 'confetti-2', 'confetti-3', 'confetti-4', 'confetti-5'];
  const e = scene.add.particles(x, y, 'effects', {
    frame: frames,
    lifespan: { min: 900, max: 1700 },
    speedX: { min: -spread / 2, max: spread / 2 },
    speedY: { min: -620, max: -240 },
    gravityY: 900,
    rotate: { min: 0, max: 360 },
    scale: { min: 2, max: 3 },
    emitting: false
  }).setDepth(depth);
  e.explode(count);
  scene.time.delayedCall(1900, () => e.destroy());
  return e;
}

/** Signed number formatting for effect previews: +18 / −12. */
export function signed(v) {
  const n = Math.round(v);
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}
