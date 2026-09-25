/**
 * The command AI's short observations. Every message is derived from live simulation state or
 * measured player behavior (never random flavor text), and the feed is paced so it never spams:
 * - routine messages need 12 simulated seconds of quiet, urgent ones (cascades, failures,
 *   adaptive changes) 4 seconds
 * - each insight is said once per situation (a warning repeats only if things got worse)
 * - the final seconds are left to the countdown: only urgent alerts get through
 */
import { SYSTEMS, RESOURCE_BY_ID, THRESHOLDS } from '../data/resources.js';
import { tuning } from './adaptive-director.js';
import { SESSION_LENGTH } from './clock.js';

export const PREFIX = {
  analysis: 'COMMAND ANALYSIS',
  warning: 'WARNING',
  update: 'SIMULATION UPDATE',
  adaptive: 'ADAPTIVE ENGINE',
  cascade: 'CASCADE ALERT',
  forecast: 'PREDICTIVE MODEL'
};

const FOCUS_PHRASE = {
  energy: 'the power grid', water: 'the water supply', health: 'healthcare', transport: 'transport',
  infrastructure: 'infrastructure', safety: 'public safety', communication: 'communications', supplies: 'supplies'
};

const GAP = 12; // minimum simulated seconds between routine messages
const URGENT_GAP = 4;
const QUIET_FINALE = 25; // no routine chatter in the last seconds

export class Analyst {
  constructor(sim) {
    this.sim = sim;
    this.lastAt = -Infinity;
    this.cooldowns = {};
    this.memory = {};
    this.timer = 0;
    this.queue = [];
    this.said = new Set();
    this.lastAdaptive = null;
  }

  ready(key, every) {
    const last = this.cooldowns[key] ?? -Infinity;
    return this.sim.t - last >= every;
  }

  mark(key, value) {
    this.cooldowns[key] = this.sim.t;
    if (value !== undefined) this.memory[key] = value;
  }

  /** Urgent messages (adaptive changes, cascades, failures) jump the queue. */
  push(kind, text, { urgent = false } = {}) {
    const msg = { kind, prefix: PREFIX[kind], text, urgent };
    if (urgent) this.queue.unshift(msg);
    else this.queue.push(msg);
  }

  update(dt) {
    this.timer += dt;
    if (this.timer < 1) return null;
    this.timer = 0;
    const sim = this.sim;
    const finale = sim.t > SESSION_LENGTH - QUIET_FINALE;
    if (finale) this.queue = this.queue.filter((m) => m.urgent);
    else if (!this.queue.some((m) => m.urgent)) this.observe();
    if (!this.queue.length) return null;
    const next = this.queue[0];
    if (sim.t - this.lastAt < (next.urgent ? URGENT_GAP : GAP)) return null;
    this.queue.shift();
    this.lastAt = sim.t;
    this.queue = this.queue.filter((m) => m.urgent).slice(0, 2);
    return { ...next, t: sim.t };
  }

  observe() {
    const sim = this.sim;
    if (this.queue.length) return;
    const assist = tuning.assist(sim.adaptive.intensity);
    const secs = (x) => `~${Math.max(5, Math.round(x / 5) * 5)} s`;

    // 1) projection warnings: will a system hit critical soon?
    if (sim.hasForesight()) {
      // AI Architect / Predictive Model: full forward simulation, including knock-on effects
      const p = sim.project(60, 2);
      const hit = p.crossings.find((c) => this.ready(`proj:${c.system}`, 35));
      if (hit) {
        this.mark(`proj:${hit.system}`);
        const next = hit.dependents.slice(0, 2).map((id) => RESOURCE_BY_ID[id].name).join(' and ');
        this.push('forecast', `${RESOURCE_BY_ID[hit.system].name} reaches critical in ${secs(hit.in)}. ${next} would follow.`);
        return;
      }
    } else {
      // everyone else: the current trend line (longer look-ahead while the engine is assisting)
      const horizon = assist ? 45 : 30;
      for (const s of SYSTEMS) {
        if (sim.isFogged(s.id)) continue; // the command AI cannot see through data fog either
        const level = sim.levels[s.id];
        const slope = sim.trendOf(s.id);
        if (level <= THRESHOLDS.critical || level > 60 || slope > -0.15) continue;
        const eta = (level - THRESHOLDS.critical) / -slope;
        if (eta < horizon && this.ready(`proj:${s.id}`, 35)) {
          this.mark(`proj:${s.id}`);
          this.push('warning', `${s.name} will reach critical levels in ${secs(eta)}.`);
          return;
        }
      }
    }

    // 2) dependency pressure: a weak system is dragging others down (repeats only if it got worse)
    for (const s of SYSTEMS) {
      const level = sim.levels[s.id];
      if (level >= 48 || sim.isFogged(s.id)) continue;
      const key = `dep:${s.id}`;
      const worse = this.memory[key] === undefined || level < this.memory[key] - 10;
      const dependents = SYSTEMS.filter((d) => d.dependsOn.some((dep) => dep.source === s.id && level < dep.below));
      if (dependents.length >= 2 && worse && this.ready(key, 60)) {
        this.mark(key, level);
        this.push('warning', `${s.name} dependency is increasing: ${dependents.slice(0, 2).map((d) => d.name).join(' and ')} are draining.`);
        return;
      }
    }

    // 3) infrastructure instability
    if (sim.levels.infrastructure < 45 && sim.trendOf('infrastructure') < -0.05 && this.ready('infra', 70)) {
      this.mark('infra');
      this.push('update', 'Infrastructure instability detected.');
      return;
    }

    // 4) command analysis from measured behavior
    const m = sim.analysis.metrics(sim);
    if (m.decisions >= 3) {
      if (m.topSystem && m.topSystem !== this.memory.focus && this.ready('focus', 45)) {
        const share = Math.max(m.peopleShare, m.cityShare);
        if (share > 0.5) {
          this.mark('focus', m.topSystem);
          this.push('analysis', `You are prioritizing ${FOCUS_PHRASE[m.topSystem]}.`);
          return;
        }
      }
      const once = (key, test, text) => {
        if (this.said.has(key) || !test) return false;
        this.said.add(key);
        this.push('analysis', text);
        return true;
      };
      if (once('fast', m.decisions >= 4 && m.avgDecisionTime < 4, `Rapid decisions detected: ${m.avgDecisionTime.toFixed(1)} s average response.`)) return;
      if (once('slow', m.decisions >= 4 && m.avgDecisionTime > 11, `Careful deliberation: ${m.avgDecisionTime.toFixed(1)} s average per decision.`)) return;
      if (once('risk', m.riskyChoices >= 3, `Bold strategy detected: ${m.riskyChoices} high-risk responses so far.`)) return;
      if (once('frugal', m.decisions >= 5 && m.spendRatio < 0.3, `Budget discipline: only ${Math.round(m.spendRatio * 100)}% of available funds spent.`)) return;
      if (once('spend', m.spendRatio > 0.7, `High spending: ${Math.round(m.spendRatio * 100)}% of the emergency budget used.`)) return;
      if (once('cascade-fix', m.cascadeAnswered >= 2, `You are answering cascades at their source (${m.cascadeAnswered} so far).`)) return;
    }

    // 5) budget and recovery notices
    if (sim.budget < 15) {
      if (!this.memory.budgetLow && this.ready('budget', 60)) {
        this.mark('budgetLow', true);
        this.push('warning', 'Emergency budget nearly empty. Low-cost responses only.');
        return;
      }
    } else if (sim.budget > 30) {
      this.memory.budgetLow = false;
    }
    const gain = sim.stability - sim.stabilityAt(sim.t - 20);
    if (gain > 9 && this.ready('recover', 50)) {
      this.mark('recover');
      this.push('update', `City stability recovering (+${Math.round(gain)} in 20 s).`);
    }
  }

  /** Adaptive changes are announced when the engine changes direction (or after a long pause). */
  adaptiveChange(change) {
    const sim = this.sim;
    const repeat = this.lastAdaptive && this.lastAdaptive.action === change.action && sim.t - this.lastAdaptive.t < 45;
    if (repeat) return;
    this.lastAdaptive = { action: change.action, t: sim.t };
    if (change.action === 'escalate') this.push('adaptive', 'Crisis complexity increased.', { urgent: true });
    else this.push('adaptive', 'Pressure eased. A recovery window is opening.', { urgent: true });
  }

  cascade(from, to) {
    this.push('cascade', `${RESOURCE_BY_ID[from].name} failure is spreading to ${RESOURCE_BY_ID[to].name.toLowerCase()}.`, { urgent: true });
  }

  snapshot() {
    return {
      lastAt: this.lastAt, cooldowns: { ...this.cooldowns }, memory: { ...this.memory }, timer: this.timer,
      queue: this.queue.map((q) => ({ ...q })), said: [...this.said], lastAdaptive: this.lastAdaptive ? { ...this.lastAdaptive } : null
    };
  }

  restore(s) {
    this.lastAt = s.lastAt;
    this.cooldowns = { ...s.cooldowns };
    this.memory = { ...s.memory };
    this.timer = s.timer;
    this.queue = s.queue.map((q) => ({ ...q }));
    this.said = new Set(s.said);
    this.lastAdaptive = s.lastAdaptive ? { ...s.lastAdaptive } : null;
  }
}
