// Keyboard focus navigation for menus: arrows move to the nearest control in that direction,
// Tab cycles, Enter/Space activate, Escape triggers the scene's "back" action. Mouse hover and
// keyboard share one focus so switching devices never strands the player.
import Phaser from 'phaser';

/**
 * Phaser can re-dispatch queued keyboard events when frames are very slow. Each key handler owns
 * one of these guards: an event is handled at most once per handler, and a handler created while
 * an event was being processed (e.g. a menu that just opened) ignores that older event.
 */
export class KeyGuard {
  constructor() {
    this.seen = new WeakSet();
    this.since = globalThis.performance?.now() ?? 0;
  }

  /** true → skip this event */
  skip(e) {
    if (e.timeStamp && e.timeStamp < this.since) return true;
    if (this.seen.has(e)) return true;
    this.seen.add(e);
    return false;
  }
}

export class FocusGroup {
  constructor(scene, { onCancel = null, initial = 0 } = {}) {
    this.scene = scene;
    this.items = [];
    this.index = -1;
    this.onCancel = onCancel;
    this.initial = initial;
    this.enabled = true;
    this.guard = new KeyGuard();
    const kb = scene.input.keyboard;
    this._onKey = (e) => this._key(e);
    kb.on('keydown', this._onKey);
    scene.events.once('shutdown', () => this.destroy());
  }

  add(item) {
    this.items.push(item);
    item.on?.('hover', () => this.focusItem(item));
    if (this.index < 0 && this.items.length - 1 === this.initial) this.focus(this.initial);
    return item;
  }

  clear() {
    for (const it of this.items) it.setFocus?.(false);
    this.items = [];
    this.index = -1;
  }

  _usable(i) {
    const it = this.items[i];
    return it && it.visible !== false && !it.disabled && it.active !== false;
  }

  focus(i) {
    if (!this._usable(i)) return;
    if (this.index >= 0) this.items[this.index]?.setFocus?.(false);
    this.index = i;
    this.items[i].setFocus?.(true);
  }

  focusItem(item) {
    const i = this.items.indexOf(item);
    if (i >= 0 && i !== this.index) this.focus(i);
  }

  current() {
    return this.items[this.index];
  }

  _center(it) {
    const b = it.getBounds();
    return { x: b.centerX, y: b.centerY };
  }

  move(dx, dy) {
    if (this.index < 0) { this.focus(0); return; }
    const from = this._center(this.items[this.index]);
    let best = -1;
    let bestScore = Infinity;
    this.items.forEach((it, i) => {
      if (i === this.index || !this._usable(i)) return;
      const c = this._center(it);
      const vx = c.x - from.x;
      const vy = c.y - from.y;
      const along = vx * dx + vy * dy;
      if (along <= 4) return;
      const across = Math.abs(vx * dy) + Math.abs(vy * dx);
      const score = along + across * 2.2;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) this.focus(best);
  }

  next(step = 1) {
    if (!this.items.length) return;
    let i = this.index;
    for (let k = 0; k < this.items.length; k++) {
      i = (i + step + this.items.length) % this.items.length;
      if (this._usable(i)) { this.focus(i); return; }
    }
  }

  _key(e) {
    if (!this.enabled || !this.scene.sys.isActive()) return;
    if (this.guard.skip(e)) return; // one key press acts once, even if Phaser re-dispatches it
    if (this.current()?.handleKey?.(e)) return; // e.g. a slider consumes ←/→
    switch (e.code) {
      case 'ArrowLeft': this.move(-1, 0); break;
      case 'ArrowRight': this.move(1, 0); break;
      case 'ArrowUp': this.move(0, -1); break;
      case 'ArrowDown': this.move(0, 1); break;
      case 'Tab': e.preventDefault?.(); this.next(e.shiftKey ? -1 : 1); break;
      case 'Enter':
      case 'NumpadEnter':
      case 'Space': this.current()?.activate?.(); break;
      case 'Escape':
      case 'Backspace': this.onCancel?.(); break;
      default: return;
    }
  }

  destroy() {
    this.scene.input.keyboard?.off('keydown', this._onKey);
    this.items = [];
  }
}

export const KEYS = Phaser.Input.Keyboard.KeyCodes;
