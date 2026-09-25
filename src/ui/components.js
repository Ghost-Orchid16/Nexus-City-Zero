// Reusable UI pieces built from the pixel UI kit (9-slices at 3×) + code-native text.
import Phaser from 'phaser';
import { PX } from '../config/layout.js';
import { UI, hex } from '../config/palette.js';
import { textStyle } from './theme.js';
import { bus } from '../core/event-bus.js';

const SLICES = {
  card: [5, 5, 5, 6], 'card-white': [5, 5, 5, 6], 'card-inset': [4, 4, 4, 4], 'card-dark': [5, 5, 5, 6],
  band: [5, 5, 5, 5], btn: [6, 6, 6, 7], 'bar-track': [4, 4, 4, 4], bar: [3, 3, 3, 3],
  select: [5, 5, 5, 5], capsule: [7, 7, 6, 6], chip: [4, 4, 4, 4]
};

function slicesFor(frame) {
  if (frame.startsWith('btn-')) return SLICES.btn;
  if (frame.startsWith('band-')) return SLICES.band;
  if (frame.startsWith('bar-') && frame !== 'bar-track') return SLICES.bar;
  if (frame.startsWith('select-')) return SLICES.select;
  if (frame.startsWith('chip-')) return SLICES.chip;
  return SLICES[frame] || [5, 5, 5, 5];
}

/** 9-slice panel from the UI atlas, sized in screen pixels (rounded to the 3× pixel grid). */
export function panel(scene, x, y, w, h, frame = 'card') {
  const [l, r, t, b] = slicesFor(frame);
  const ns = scene.add.nineslice(x, y, 'ui', frame, Math.max(l + r + 1, Math.round(w / PX)), Math.max(t + b + 1, Math.round(h / PX)), l, r, t, b);
  ns.setScale(PX).setOrigin(0);
  return ns;
}

/** Resize a panel created by `panel()` (keeps the 3× grid). */
export function resizePanel(ns, w, h) {
  const [l, r, t, b] = slicesFor(ns.frame.name);
  ns.setSize(Math.max(l + r + 1, Math.round(w / PX)), Math.max(t + b + 1, Math.round(h / PX)));
  return ns;
}

/** Pixel-art icon from an atlas, scaled to the UI grid. */
export function icon(scene, x, y, frame, { atlas = 'icons', scale = PX } = {}) {
  return scene.add.image(x, y, atlas, frame).setScale(scale);
}

/** Round colored badge with an icon on top. */
export function iconBadge(scene, x, y, iconFrame, color = 'cream', { scale = PX, iconScale = PX - 1 } = {}) {
  const c = scene.add.container(x, y);
  c.add(scene.add.image(0, 0, 'ui', `badge-${color}`).setScale(scale));
  c.add(scene.add.image(0, -1, 'icons', iconFrame).setScale(iconScale));
  return c;
}

export function label(scene, x, y, text, opts = {}) {
  return scene.add.text(Math.round(x), Math.round(y), text, textStyle(opts));
}

/**
 * Chunky game button: 9-slice face with hover/pressed art, optional icon, keyboard focus ring.
 * Emits `onClick` on pointer up (inside) or when activated by the focus navigator.
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { text, width = 360, height = 84, color = 'teal', iconFrame = null, iconAtlas = 'icons', size = 32, onClick = null, textColor = null, sub = null, disabled = false, sfx = 'click' }) {
    super(scene, x, y);
    this.color = color;
    this.w = width;
    this.h = height;
    this.onClick = onClick;
    this.sfx = sfx;
    this.bg = panel(scene, -width / 2, -height / 2, width, height, `btn-${color}`);
    this.add(this.bg);
    const light = ['yellow', 'stone'].includes(color);
    const tc = textColor || (light ? UI.ink : UI.white);
    const content = scene.add.container(0, 0);
    this.content = content;
    let tx = 0;
    if (iconFrame) {
      this.iconImg = scene.add.image(0, -3, iconAtlas, iconFrame).setScale(iconAtlas === 'icons' ? PX : PX);
      content.add(this.iconImg);
    }
    this.text = scene.add.text(0, sub ? -16 : -4, text, textStyle({ size, font: 'body', weight: '900', color: tc, stroke: light ? null : UI.ink, strokeThickness: light ? 0 : 6, align: 'center' })).setOrigin(0.5);
    content.add(this.text);
    if (sub) {
      this.subText = scene.add.text(0, 20, sub, textStyle({ size: Math.round(size * 0.62), weight: '800', color: tc, stroke: light ? null : UI.ink, strokeThickness: light ? 0 : 4, align: 'center' })).setOrigin(0.5);
      content.add(this.subText);
    }
    if (iconFrame) {
      const iw = this.iconImg.displayWidth + 14;
      const total = iw + this.text.width;
      tx = -total / 2 + iw;
      this.iconImg.x = -total / 2 + this.iconImg.displayWidth / 2;
      this.text.setOrigin(0, 0.5).setX(tx);
      if (this.subText) this.subText.setOrigin(0, 0.5).setX(tx);
    }
    this.add(content);
    this.focusRing = panel(scene, -width / 2 - 12, -height / 2 - 12, width + 24, height + 24, 'select-gold').setVisible(false);
    this.addAt(this.focusRing, 0);
    this.setSize(width, height);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => this.setHover(true));
    this.bg.on('pointerout', () => { this.setHover(false); this.setPressed(false); });
    this.bg.on('pointerdown', () => this.setPressed(true));
    this.bg.on('pointerup', () => { if (this.pressed) this.activate(); this.setPressed(false); });
    this.setDisabled(disabled);
    scene.add.existing(this);
  }

  setHover(on) {
    if (this.disabled) return;
    this.hovered = on;
    this._frame();
    this.scene.tweens.add({ targets: this, scale: on ? 1.035 : 1, duration: 120, ease: 'Back.easeOut' });
    if (on) this.emit('hover', this);
  }

  setPressed(on) {
    if (this.disabled) return;
    this.pressed = on;
    this._frame();
    this.content.y = on ? 6 : 0;
  }

  _frame() {
    const suffix = this.pressed ? '-down' : this.hovered ? '-hover' : '';
    this.bg.setFrame(`btn-${this.disabled ? 'stone' : this.color}${suffix}`);
  }

  setFocus(on) {
    this.focused = on;
    this.focusRing.setVisible(on);
    if (on) {
      this.scene.tweens.killTweensOf(this.focusRing);
      this.focusRing.setAlpha(1);
      this.scene.tweens.add({ targets: this.focusRing, alpha: 0.55, yoyo: true, repeat: -1, duration: 520 });
    }
  }

  setDisabled(d) {
    this.disabled = d;
    this.setAlpha(d ? 0.55 : 1);
    this._frame();
    return this;
  }

  setText(t) {
    this.text.setText(t);
    return this;
  }

  activate() {
    if (this.disabled || !this.visible) return;
    bus.emit('sfx', this.sfx);
    this.scene.tweens.add({ targets: this, scale: { from: 0.96, to: 1 }, duration: 160, ease: 'Back.easeOut' });
    this.onClick?.(this);
  }
}

/** Animated horizontal bar using the pixel track + fill 9-slices. */
export class Bar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { width = 300, height = 24, fill = 'teal', value = 1 } = {}) {
    super(scene, x, y);
    this.w = width;
    this.h = height;
    this.track = panel(scene, 0, 0, width, height, 'bar-track');
    this.fill = panel(scene, PX * 2, PX * 2, Math.max(24, width - PX * 4), height - PX * 4, `bar-${fill}`);
    this.ghost = scene.add.rectangle(PX * 2, PX * 2, 0, height - PX * 4, 0xffffff, 0.35).setOrigin(0);
    this.add([this.track, this.ghost, this.fill]);
    this.value = -1;
    this.setValue(value, false);
    scene.add.existing(this);
  }

  setFillFrame(fill) {
    const f = `bar-${fill}`;
    if (this.fill.frame.name !== f) this.fill.setFrame(f);
  }

  /** value 0..1; animated shrink leaves a fading "ghost" to show the loss. */
  setValue(v, animate = true) {
    v = Phaser.Math.Clamp(v, 0, 1);
    if (Math.abs(v - this.value) < 0.001) return;
    const inner = this.w - PX * 4;
    const target = Math.max(0, inner * v);
    const prev = this.value < 0 ? v : this.value;
    this.value = v;
    const apply = (px) => {
      const vis = px >= 20;
      this.fill.setVisible(vis);
      if (vis) resizePanel(this.fill, px, this.h - PX * 4);
    };
    if (!animate) { apply(target); return; }
    if (v < prev) {
      this.ghost.width = inner * prev;
      this.ghost.setAlpha(0.45);
      this.scene.tweens.add({ targets: this.ghost, width: target, alpha: 0.15, duration: 900, delay: 250, ease: 'Cubic.easeIn' });
    }
    const state = { px: this.fill.visible ? this.fill.width * PX : 0 };
    this.scene.tweens.add({ targets: state, px: target, duration: 450, ease: 'Cubic.easeOut', onUpdate: () => apply(state.px) });
  }
}

/** Small rounded chip with an icon and a signed value, e.g. "+18 ⚡". */
export function effectChip(scene, x, y, resourceIcon, delta, { size = 24, cost = false } = {}) {
  const c = scene.add.container(x, y);
  const good = cost ? false : delta > 0;
  const frame = cost ? 'chip-cost' : delta === 0 ? 'chip-neutral' : good ? 'chip-good' : 'chip-bad';
  const txt = scene.add.text(0, 0, `${delta > 0 && !cost ? '+' : ''}${cost ? '-' + Math.abs(delta) : delta}`, textStyle({ size, weight: '900', color: UI.ink })).setOrigin(0, 0.5);
  const ic = scene.add.image(0, 0, 'icons', resourceIcon).setScale(2);
  const w = ic.displayWidth + txt.width + 26;
  const bg = panel(scene, 0, -21, w, 42, frame);
  ic.setPosition(10 + ic.displayWidth / 2, -1);
  txt.setX(ic.displayWidth + 16);
  c.add([bg, ic, txt]);
  c.width = w;
  return c;
}

/** Fade/iris transition between scenes. */
export function transitionTo(scene, key, data = {}, { color = UI.hudLight, duration = 260 } = {}) {
  if (scene._leaving) return;
  scene._leaving = true;
  const cam = scene.cameras.main;
  const c = Phaser.Display.Color.HexStringToColor(color);
  cam.fadeOut(duration, c.red, c.green, c.blue);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}

export function fadeIn(scene, { color = UI.hudLight, duration = 260 } = {}) {
  const c = Phaser.Display.Color.HexStringToColor(color);
  scene.cameras.main.fadeIn(duration, c.red, c.green, c.blue);
  scene._leaving = false;
}

export { hex };
