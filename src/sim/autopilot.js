/**
 * Autopilot commanders. Used by the Monte Carlo balance tool, the automated tests (hundreds of
 * simulated runs must never reach a broken state) and the title screen's attract-mode demo.
 *
 * Skill levels:
 * - none:     never answers a crisis (the baseline: how hard is the city without a commander?)
 * - random:   answers after a random delay with a random affordable option
 * - greedy:   picks the option that leaves the city most stable right now
 * - expert:   projects each option 30 s ahead through the cascade graph, values the remaining
 *             budget and avoids risky follow-ups (a stand-in for a thoughtful player)
 *
 * Personas (deliberately biased players that verify the play-style analysis):
 * - planner, daredevil, saver, firefighter, builder, caretaker, shifter
 */
import { RNG } from '../core/rng.js';
import { PEOPLE_SYSTEMS, CITY_SYSTEMS } from '../data/resources.js';
import { SESSION_LENGTH } from './clock.js';
import { riskScore } from './strategy-analysis.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const sumOf = (effects, keys) => keys.reduce((s, k) => s + Math.max(0, effects[k] || 0), 0);

/** Think time (real seconds) before answering, per strategy. */
const THINK = {
  none: () => Infinity,
  random: (rng) => rng.float(2, 9),
  greedy: (rng) => rng.float(2, 6),
  expert: (rng) => rng.float(3, 8),
  planner: (rng) => rng.float(8, 14),
  daredevil: (rng) => rng.float(3, 6),
  saver: (rng) => rng.float(4, 8),
  firefighter: (rng) => rng.float(1, 2.5),
  builder: (rng) => rng.float(3, 7),
  caretaker: (rng) => rng.float(3, 7),
  shifter: (rng) => rng.float(3, 7)
};

export const STRATEGIES = Object.keys(THINK);

export class Autopilot {
  constructor(strategy = 'greedy', seed = 1) {
    if (!THINK[strategy]) throw new Error(`Unknown autopilot strategy: ${strategy}`);
    this.strategy = strategy;
    this.rng = new RNG(`autopilot:${strategy}:${seed}`);
    this.pending = null;
    this.wait = 0;
    this.horizon = 30;
  }

  /** Call once per frame with the same real dt passed to sim.update(). */
  update(sim, dt) {
    if (sim.ended || this.strategy === 'none') return;
    const ev = sim.activeEvent;
    if (ev) {
      if (this.pending !== ev) {
        this.pending = ev;
        this.wait = THINK[this.strategy](this.rng);
      }
      this.wait -= dt;
      if (this.wait <= 0) {
        const id = this.pick(sim, ev);
        if (id) sim.choose(id);
      }
    }
    if (sim.canUseAbility() && this.wantsAbility(sim)) sim.useAbility();
  }

  pick(sim, ev) {
    const open = ev.choices.filter((c) => !c.locked);
    if (!open.length) return null;
    if (this.strategy === 'random') return this.rng.pick(open).id;
    let best = null;
    let bestScore = -Infinity;
    for (const c of open) {
      const score = this.score(sim, ev, c);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best.id;
  }

  score(sim, ev, c) {
    const s = this.strategy;
    if (s === 'greedy') return this.immediate(sim, c);
    const smart = this.ahead(sim, c);
    const people = sumOf(c.effects, PEOPLE_SYSTEMS);
    const city = sumOf(c.effects, CITY_SYSTEMS);
    switch (s) {
      case 'planner': return smart - riskScore(c, c.effects) * 25 + (c.tags.includes('preventive') ? 4 : 0);
      case 'daredevil': return riskScore(c, c.effects) * 40 + smart * 0.2;
      case 'saver': return -c.cost + smart * 0.15;
      case 'firefighter': return Math.max(0, c.effects[sim.weakestSystem()] || 0) * 2 + smart * 0.3;
      case 'builder': return city - people + smart * 0.2;
      case 'caretaker': return people - city + smart * 0.2;
      case 'shifter': {
        // first half: cheap and careful; after the consequences hit: people-first and all-in.
        // Cascades are always answered at their source.
        const fix = ev.reason === 'cascade' ? Math.max(0, c.effects[ev.system] || 0) * 3 : 0;
        const phase = sim.t < SESSION_LENGTH / 2
          ? -c.cost - riskScore(c, c.effects) * 20
          : c.cost * 0.6 + (people - city) * 0.5 + riskScore(c, c.effects) * 10;
        return fix + phase + smart * 0.1;
      }
      default: return smart;
    }
  }

  /** Stability right after the choice, with extra weight on keeping every system out of danger. */
  immediate(sim, c) {
    const levels = { ...sim.levels };
    for (const [k, v] of Object.entries(c.effects)) if (k in levels) levels[k] = clamp(levels[k] + v, 0, 100);
    for (const l of c.lingering) levels[l.system] = clamp(levels[l.system] + l.rate * Math.min(l.duration, 40), 0, 100);
    const budget = sim.budget - (c.underfunded ? sim.budget : c.cost) + (c.effects.budget || 0);
    let score = sim.computeStability(levels, budget);
    for (const v of Object.values(levels)) score -= Math.max(0, 35 - v) * 0.15;
    return score;
  }

  /** Look ahead: where does the city end up if I pick this? */
  ahead(sim, c) {
    const levels = { ...sim.levels };
    for (const [k, v] of Object.entries(c.effects)) if (k in levels) levels[k] = clamp(levels[k] + v, 0, 100);
    const p = sim.project(this.horizon, 2, levels);
    for (const l of c.lingering) p.levels[l.system] = clamp(p.levels[l.system] + l.rate * Math.min(l.duration, this.horizon), 0, 100);
    const budget = sim.budget - (c.underfunded ? sim.budget : c.cost) + (c.effects.budget || 0);
    let score = sim.computeStability(p.levels, budget) + budget * 0.05 - (c.risk || 0) * 5;
    for (const v of Object.values(p.levels)) score -= Math.max(0, 30 - v) * 0.2;
    return score;
  }

  wantsAbility(sim) {
    if (this.strategy === 'random') return this.rng.chance(0.004);
    if (sim.criticalSystems().length > 0) return true;
    if (this.strategy === 'saver') return false;
    if (sim.t > SESSION_LENGTH - 45) return true; // use it or lose it
    const L = sim.levels;
    switch (sim.ability.id) {
      case 'reactor': return L.energy < 40;
      case 'analysis': return !!sim.activeEvent; // boosts the response being chosen right now
      case 'repair': return Math.min(L.infrastructure, L.energy, L.water, L.transport) < 45;
      case 'medical': return L.health < 50 || L.safety < 45;
      case 'grid': return L.energy < 45;
      case 'routing': return L.transport < 50 || L.supplies < 50;
      case 'predict': return sim.t > 10; // early foresight softens the next crises
      default: return sim.stability < 70;
    }
  }
}

/** Play a whole run headlessly. Returns the finished simulation. */
export function playRun(sim, strategy = 'greedy', { seed = 1, frame = 0.1, maxFrames = 20000 } = {}) {
  const pilot = new Autopilot(strategy, seed);
  for (let i = 0; i < maxFrames && !sim.ended; i++) {
    pilot.update(sim, frame);
    sim.update(frame);
  }
  return sim;
}
