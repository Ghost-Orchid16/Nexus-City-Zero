/**
 * Event director: decides WHEN the next crisis arrives and WHICH one.
 * Selection is a seeded weighted draw over the eligible deck; weights combine the scenario's
 * themes, the adaptive engine (complexity vs. recovery), the city's weakest system and
 * anti-repetition. Cascade and follow-up crises are queued with priority.
 */
import { EVENT_BY_ID, DECK, CASCADE_EVENT } from '../data/events/index.js';
import { tuning } from './adaptive-director.js';

export class EventDirector {
  constructor(sim, { themes = {}, opening = null, eventRate = 1, firstAt = 3 } = {}) {
    this.sim = sim;
    this.themes = themes;
    this.opening = opening;
    this.eventRate = eventRate;
    this.nextAt = firstAt;
    this.queue = [];
    this.used = new Set();
    this.lastCascadeAt = {};
    this.recent = [];
    this.forecast = [];
    this.enabled = true;
  }

  eligible(def) {
    if (def.kind !== 'recovery' && this.used.has(def.id)) return false;
    if (def.kind === 'recovery' && this.recent.slice(-6).includes(def.id)) return false;
    for (const [sys, op, v] of def.when) {
      const level = this.sim.levels[sys];
      if (op === '<' && !(level < v)) return false;
      if (op === '>' && !(level > v)) return false;
    }
    return true;
  }

  weightOf(def) {
    let w = def.weight;
    let theme = 1;
    for (const tag of def.themes) theme = Math.max(theme, this.themes[tag] || 1);
    w *= theme;
    const intensity = this.sim.adaptive.intensity;
    if (def.kind === 'recovery') w *= tuning.recoveryBias(intensity);
    const touched = new Set([...Object.keys(def.impact), ...def.choices.flatMap((c) => Object.keys(c.effects))]);
    if (touched.size >= 4) w *= tuning.complexityBias(intensity);
    const weakest = this.sim.weakestSystem();
    if (def.impact[weakest] !== undefined || def.category === weakest) w *= 1.4;
    const recentCats = this.recent.slice(-2).map((id) => EVENT_BY_ID[id].category);
    if (recentCats.includes(def.category)) w *= 0.4;
    return w;
  }

  draw() {
    const pool = DECK.filter((d) => this.eligible(d) && !this.forecast.includes(d.id));
    const pick = this.sim.rng.weighted(pool, (d) => this.weightOf(d));
    return pick ? pick.id : null;
  }

  interval() {
    const base = tuning.eventInterval(this.sim.adaptive.intensity) / this.eventRate;
    return Math.max(9, base * this.sim.rng.float(0.85, 1.15));
  }

  /** Pre-draw the next `n` crises (Scientist's Rapid Analysis shows them). */
  peek(n) {
    while (this.forecast.length < n) {
      const id = this.draw();
      if (!id) break;
      this.forecast.push(id);
    }
    return this.forecast.slice(0, n);
  }

  /** Returns the next crisis to activate this tick, or null. */
  update() {
    const sim = this.sim;
    if (!this.enabled || sim.activeEvent) return null;
    const dueIndex = this.queue.findIndex((q) => q.at <= sim.t);
    if (dueIndex >= 0) {
      const q = this.queue.splice(dueIndex, 1)[0];
      return q;
    }
    if (sim.t < this.nextAt) return null;
    let id = null;
    if (this.opening && !this.used.has(this.opening)) id = this.opening;
    while (!id && this.forecast.length) {
      const f = this.forecast.shift();
      if (this.eligible(EVENT_BY_ID[f])) id = f;
    }
    if (!id) id = this.draw();
    this.nextAt = sim.t + this.interval();
    return id ? { id, reason: 'deck' } : null;
  }

  onActivated(id) {
    this.used.add(id);
    this.recent.push(id);
  }

  /** A system went critical: queue its cascade crisis (once per 50 s per system). */
  raiseCascade(system) {
    const id = CASCADE_EVENT[system];
    if (!id) return false;
    const last = this.lastCascadeAt[system] ?? -Infinity;
    if (this.sim.t - last < 50 || this.queue.some((q) => q.id === id)) return false;
    this.lastCascadeAt[system] = this.sim.t;
    this.queue.unshift({ id, at: this.sim.t, reason: 'cascade', system });
    return true;
  }

  raiseFollowUp(id, delay) {
    if (this.used.has(id) || this.queue.some((q) => q.id === id)) return false;
    this.queue.push({ id, at: this.sim.t + delay, reason: 'followup' });
    return true;
  }

  snapshot() {
    return {
      nextAt: this.nextAt, queue: this.queue.map((q) => ({ ...q })), used: [...this.used],
      lastCascadeAt: { ...this.lastCascadeAt }, recent: [...this.recent], forecast: [...this.forecast], enabled: this.enabled
    };
  }

  restore(s) {
    this.nextAt = s.nextAt;
    this.queue = s.queue.map((q) => ({ ...q }));
    this.used = new Set(s.used);
    this.lastCascadeAt = { ...s.lastCascadeAt };
    this.recent = [...s.recent];
    this.forecast = [...s.forecast];
    this.enabled = s.enabled;
  }
}
