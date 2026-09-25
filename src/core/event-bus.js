/**
 * Minimal event emitter with no engine dependency, so the headless simulation (src/sim) and the
 * Phaser scenes can share it. Listeners are called synchronously in registration order.
 */
export class Emitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, fn, context = null) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push({ fn, context, once: false });
    return () => this.off(event, fn, context);
  }

  once(event, fn, context = null) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push({ fn, context, once: true });
    return () => this.off(event, fn, context);
  }

  off(event, fn, context = null) {
    const list = this._listeners.get(event);
    if (!list) return;
    const i = list.findIndex((l) => l.fn === fn && l.context === context);
    if (i >= 0) list.splice(i, 1);
  }

  emit(event, payload) {
    const list = this._listeners.get(event);
    if (!list || list.length === 0) return;
    for (const l of [...list]) {
      if (l.once) this.off(event, l.fn, l.context);
      l.fn.call(l.context, payload);
    }
  }

  removeAll() {
    this._listeners.clear();
  }
}

/** App-wide bus for cross-scene signals (settings changed, audio cues, exhibition idle, …). */
export const bus = new Emitter();
