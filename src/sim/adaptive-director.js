/**
 * Adaptive difficulty director (utility AI with hysteresis).
 *
 * Every 5 simulated seconds it reads facts about the run (stability, trend, critical systems,
 * recent cascades, budget), maps each through a response curve, and scores three actions:
 * ESCALATE (the commander is doing extremely well), RELIEVE (the commander is struggling) and
 * HOLD. The winner only takes effect when it wins twice in a row and the cooldown has passed, so
 * difficulty moves smoothly instead of flip-flopping.
 */
import { clamp01, inverseLerp01, sigmoid, smoothstep, compensatedProduct } from './curves.js';

export const INTENSITY = { min: 0.6, max: 1.5, start: 1.0, step: 0.12, every: 5, cooldown: 15, warmup: 30 };

const norm = (i) => (i - INTENSITY.min) / (INTENSITY.max - INTENSITY.min);

/**
 * Knobs the rest of the simulation reads. Every knob is visible to the player through the
 * numbers on the cards and bars, so the adaptation stays honest (no hidden rubber-banding).
 * - eventInterval: seconds between crises (more frequent when the player is doing well)
 * - negativeMult: size of crisis impacts and choice side effects (harder trade-offs)
 * - decayMult: background resource pressure
 * - cascadeMult: how hard failing systems drag their dependents (more interconnected crises)
 * - ease: bonus on positive effects while struggling (easier stabilization)
 * - recoveryBias / complexityBias: event-deck weights for recovery vs. many-system crises
 * - assist: clearer warnings and more time to decide
 */
export const tuning = {
  eventInterval: (i) => 15 / (0.55 + 0.45 * i),
  negativeMult: (i) => 0.75 + 0.5 * norm(i),
  decayMult: (i) => 0.82 + 0.36 * norm(i),
  cascadeMult: (i) => 0.85 + 0.3 * norm(i),
  ease: (i) => (i < 1 ? 1 + (1 - i) * 0.25 : 1),
  recoveryBias: (i) => (i < 0.85 ? 2.8 : i < 1.05 ? 1 : 0.45),
  complexityBias: (i) => 0.6 + 0.8 * norm(i),
  assist: (i) => i <= 0.84
};

export class AdaptiveDirector {
  constructor(start = INTENSITY.start) {
    this.intensity = start;
    this.current = 'hold';
    this.pending = null;
    this.pendingCount = 0;
    this.lastChange = -Infinity;
    this.timer = 0;
    this.lastScores = null;
    this.changes = [];
  }

  facts(sim) {
    const stab = sim.stability;
    const past = sim.stabilityAt(sim.t - 20);
    const critical = sim.criticalSystems().length;
    const cascades = sim.cascades.filter((c) => c.t > sim.t - 30).length;
    return {
      stability: stab / 100,
      trend: inverseLerp01(stab - past, -20, 20),
      criticalFree: 1 - Math.min(1, critical / 3),
      cascadeCalm: 1 - Math.min(1, cascades / 2),
      budget: sim.budget / 100
    };
  }

  performance(f) {
    return clamp01(0.45 * f.stability + 0.2 * f.trend + 0.2 * f.criticalFree + 0.1 * f.cascadeCalm + 0.05 * f.budget);
  }

  score(sim) {
    const f = this.facts(sim);
    const p = this.performance(f);
    const headroomUp = 1 - norm(this.intensity);
    const headroomDown = norm(this.intensity);
    // Only clearly strong play escalates and only real struggle relieves: the wide HOLD band in
    // between means a solid, steady commander is left alone.
    const scores = {
      escalate: compensatedProduct([sigmoid(p, 14, 0.83), smoothstep(headroomUp + 0.15)]),
      relieve: compensatedProduct([sigmoid(1 - p, 12, 0.5), smoothstep(headroomDown + 0.15)]),
      hold: 0.42
    };
    scores[this.current] += 0.08; // inertia: commit to the current stance on near-ties
    return { facts: f, performance: p, scores };
  }

  /** Called by the simulation every tick. Returns a change record when intensity moves. */
  update(sim, dt) {
    this.timer += dt;
    if (sim.t < INTENSITY.warmup || this.timer < INTENSITY.every) return null;
    this.timer = 0;
    const s = this.score(sim);
    this.lastScores = s;
    const best = Object.entries(s.scores).sort((a, b) => b[1] - a[1])[0][0];
    if (best === this.pending) this.pendingCount++;
    else { this.pending = best; this.pendingCount = 1; }
    this.current = best;
    if (best === 'hold' || this.pendingCount < 2 || sim.t - this.lastChange < INTENSITY.cooldown) return null;
    const dir = best === 'escalate' ? 1 : -1;
    const next = Math.min(INTENSITY.max, Math.max(INTENSITY.min, this.intensity + dir * INTENSITY.step));
    if (next === this.intensity) return null;
    const change = { t: sim.t, from: this.intensity, to: next, action: best, performance: s.performance };
    this.intensity = Math.round(next * 100) / 100;
    this.lastChange = sim.t;
    this.pendingCount = 0;
    this.changes.push(change);
    return change;
  }

  snapshot() {
    return { intensity: this.intensity, current: this.current, pending: this.pending, pendingCount: this.pendingCount, lastChange: this.lastChange, timer: this.timer, changes: this.changes.map((c) => ({ ...c })) };
  }

  restore(s) {
    Object.assign(this, { ...s, changes: s.changes.map((c) => ({ ...c })) });
  }
}
