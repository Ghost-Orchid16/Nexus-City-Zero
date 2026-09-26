/**
 * NEXUS city simulation: the headless, deterministic heart of the game (no Phaser in here).
 *
 * Time: `update(realDt)` advances a fixed-step clock (0.1 simulated seconds per step). While a
 * crisis card is open the whole city runs at 30% speed and the card's response timer counts real
 * seconds, so reading a card never feels rushed but hesitating still costs something.
 *
 * Every step:
 *  1. crisis decay per system (scenario pressure × adaptive pressure × role modifiers × rules)
 *  2. dependency drain: a system below its threshold drags its dependents down (the cascade graph
 *     in src/data/resources.js). "POWER ↓ → WATER ↓ → HEALTH ↓" emerges from this one rule.
 *  3. lingering effects of earlier choices, rule drains and emergency-budget income
 *  4. threshold crossings: CRITICAL starts a cascade (and raises its crisis card), FAILURE counts
 *     as a critical failure
 *  5. scenario rules, adaptive director, history samples, final-minute phases, collapse check,
 *     the event director (next crisis) and the command-AI observations
 *
 * All randomness flows through seeded RNG streams, so a run is reproducible from its seed and the
 * What-If system can restore a snapshot and play out a different choice.
 */
import { Emitter } from '../core/event-bus.js';
import { RNG } from '../core/rng.js';
import { SYSTEMS, SYSTEM_IDS, RESOURCE_BY_ID, THRESHOLDS, BUDGET } from '../data/resources.js';
import { CHARACTER_BY_ID } from '../data/characters.js';
import { BASE_DECAY } from '../data/scenarios.js';
import { EVENT_BY_ID } from '../data/events/index.js';
import { DISTRICT_BY_ID } from '../data/city-layout.js';
import { CLOCK, FAST_PHASE, SESSION_LENGTH, clockAt, timeForClock, nightAt } from './clock.js';
import { activeRules } from './rules.js';
import { AdaptiveDirector, tuning } from './adaptive-director.js';
import { EventDirector } from './event-director.js';
import { StrategyAnalysis, riskScore } from './strategy-analysis.js';
import { Analyst } from './analyst.js';
import { ABILITIES } from './abilities.js';

export const SIM = {
  step: 0.1, // fixed simulation step (simulated seconds)
  maxFrame: 0.25, // longest real frame accepted, so a stalled tab never fast-forwards the city
  responseWindow: 22, // real seconds to answer a crisis card
  responseWindowFinal: 16, // …during the final minute
  assistWindow: 5, // extra seconds while the adaptive engine is assisting
  breather: 3, // calm simulated seconds after each decision before the next crisis
  eventCutoff: 7, // no new crisis in the last seconds of the run
  budgetRegen: 0.16, // emergency budget income per simulated second
  budgetCap: 150,
  collapseStability: 25, // below this stability the city starts to collapse…
  collapseAfter: 10, // …and falls after this many simulated seconds
  sampleEvery: 2, // history resolution (charts, trends, timeline)
  hazardLinger: 12, // seconds a map hazard stays after a response
  hazardLingerIgnored: 28, // …after an ignored crisis
  crewTime: 24, // seconds a repair crew works on site
  soften: 0.7, // Predictive Model: crisis impact multiplier
  underfunded: 0.5, // effect of a response you cannot fully pay for
  finalDecay: 1.25, // CRITICAL WINDOW: pressure during the final minute
  imminentCascade: 1.3, // SYSTEM CASCADE IMMINENT: dependency drain during the last 30 s
  operationalFull: 70, // a system at or above this level is fully operational…
  operationalFloor: 12, // …and at the failure line it is out of service
  budgetReserve: 50, // a budget reserve this large counts as fully operational
  effectScale: 1, // strength of every response's benefits (cards always show the final numbers)
  sideScale: 1, // strength of every response's side effects
  impactScale: 0.6, // strength of the hit when a crisis appears
  ignoreScale: 1.3, // strength of the consequences when a crisis is left unanswered
  baseDecay: BASE_DECAY, // background wear on every system (points per simulated second)
  scenarioDecayScale: 0.75, // strength of the crisis theme's pressure
  dependencyScale: 0.9, // global strength of the cascade graph
  recoverMargin: 10, // a critical system must climb this far above critical to count as recovered
  laterDelay: 15 // seconds after a decision when its impact is measured for the timeline
};

const TICKS_PER_SECOND = Math.round(1 / SIM.step);
const TICKS_PER_SAMPLE = Math.round(SIM.sampleEvery / SIM.step);
const IMMINENT_AT = timeForClock(30);
const FOREVER = 1e9;

/** Final-minute warnings (real seconds left on the 15:00 countdown: 60, 30, 10). */
export const PHASES = [
  { id: 'critical-window', at: timeForClock(60), title: 'CRITICAL WINDOW', text: 'Final minute: crisis pressure is rising.' },
  { id: 'cascade-imminent', at: timeForClock(30), title: 'SYSTEM CASCADE IMMINENT', text: 'Failures now spread 30% faster.' },
  { id: 'stability-critical', at: timeForClock(10), title: 'CITY STABILITY CRITICAL', text: 'Ten seconds left. Hold the city together!' }
];

/** For each system, the systems that depend on it (strongest dependency first). */
export const DEPENDENTS = Object.fromEntries(
  SYSTEM_IDS.map((id) => [
    id,
    SYSTEMS.flatMap((s) => s.dependsOn.filter((d) => d.source === id).map((d) => ({ id: s.id, strength: d.strength })))
      .sort((a, b) => b.strength - a.strength)
      .map((d) => d.id)
  ])
);

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** 0..1 operational share of one system at `level` (see computeStability). */
export function operational(level) {
  return clamp((level - SIM.operationalFloor) / (SIM.operationalFull - SIM.operationalFloor), 0, 1);
}

const round1 = (v) => Math.round(v * 10) / 10;
const roundLevels = (levels) => Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, round1(v)]));
const copyList = (list) => list.map((x) => ({ ...x }));

export class Simulation extends Emitter {
  /**
   * @param {object} config run configuration from createRunConfig() in ./run-setup.js
   * @param {{quiet?: boolean}} options quiet = sandbox for What-If branches: no command-AI
   *   messages and no decision snapshots
   */
  constructor(config, { quiet = false } = {}) {
    super();
    this.config = config;
    this.quiet = quiet;
    this.character = CHARACTER_BY_ID[config.character];
    if (!this.character) throw new Error(`Unknown character: ${config.character}`);
    this.rng = new RNG(config.seed);
    this.riskRng = this.rng.fork('risk'); // follow-up rolls never disturb the main sequence
    this.rules = activeRules(config.rules || []);
    this.eventRate = this.rules.reduce((m, r) => m * (r.eventRate || 1), 1);
    this.budgetRegenMult = this.rules.reduce((m, r) => m * (r.budgetRegen ?? 1), 1);
    this.cascadeMults = {};
    for (const r of this.rules) for (const [k, v] of Object.entries(r.cascadeMult || {})) this.cascadeMults[k] = (this.cascadeMults[k] ?? 1) * v;
    this.fogSystems = config.fogSystems || [];

    this.ticks = 0;
    this.t = 0;
    this.acc = 0;
    this.levels = Object.fromEntries(SYSTEM_IDS.map((id) => [id, clamp(config.start[id], 0, 100)]));
    this.budget = config.budget;
    this.budgetStart = config.budget;
    this.budgetEarned = config.budget;
    this.budgetSpent = 0;
    this.flags = new Set();
    this.lingering = [];
    this.hazards = [];
    this.crews = [];
    this.shields = { cascade: {}, decay: {} };
    const a = this.character.ability;
    this.ability = { id: a.id, name: a.name, icon: a.icon, charges: a.charges, maxCharges: a.charges, cooldown: a.cooldown, readyAt: 0, uses: 0 };
    this.buffs = { boost: 1, soften: 0 };
    this.predictUntil = -1;
    this.reactorActive = false;
    this.zone = Object.fromEntries(SYSTEM_IDS.map((id) => [id, 'ok']));
    this.minLevels = { ...this.levels };
    this.collapseTimer = 0;
    this.phaseIndex = 0;
    this.activeEvent = null;
    this.quietUntil = 0;
    this.decisions = [];
    this.cascades = [];
    this.blocked = [];
    this.criticalFailures = 0;
    this.log = [];
    this.messages = [];
    this.series = [];
    this.ended = false;
    this.outcome = null;
    this.endedAt = null;
    this.adaptiveFrozen = false;

    this.adaptive = new AdaptiveDirector();
    this.events = new EventDirector(this, { themes: config.themes || {}, opening: config.opening || null, eventRate: this.eventRate });
    this.analysis = new StrategyAnalysis();
    this.analyst = new Analyst(this);

    this.rates = this.computeRates();
    this.stability = this.computeStability();
    this.minStability = this.stability;
    this.peakStability = this.stability;
    this.sample();
  }

  // ------------------------------------------------------------------ small helpers
  perk(name) {
    return this.character.perks.includes(name);
  }

  districtName(id) {
    return DISTRICT_BY_ID[id]?.name ?? id;
  }

  systemName(id) {
    return RESOURCE_BY_ID[id]?.name ?? id;
  }

  eventTitle(id) {
    return EVENT_BY_ID[id]?.title ?? id;
  }

  /** In-game seconds left on the 15:00 countdown. */
  clock() {
    return clockAt(this.t);
  }

  night() {
    return nightAt(this.t);
  }

  get progress() {
    return Math.min(1, this.t / SESSION_LENGTH);
  }

  /** Apply level/budget changes; returns what actually changed after clamping. */
  applyDeltas(deltas) {
    const applied = {};
    for (const [k, v] of Object.entries(deltas)) {
      if (!v) continue;
      if (k === 'budget') {
        const before = this.budget;
        this.budget = clamp(this.budget + v, 0, SIM.budgetCap);
        if (this.budget > before) this.budgetEarned += this.budget - before;
        applied.budget = round1(this.budget - before);
      } else if (k in this.levels) {
        const before = this.levels[k];
        this.levels[k] = clamp(before + v, 0, 100);
        applied[k] = round1(this.levels[k] - before);
      }
    }
    return applied;
  }

  /** Spend emergency budget (never below zero); returns the amount actually paid. */
  spend(amount) {
    const paid = Math.min(this.budget, Math.max(0, amount));
    this.budget -= paid;
    this.budgetSpent += paid;
    return paid;
  }

  shield(kind, system, seconds) {
    this.shields[kind][system] = Math.max(this.shields[kind][system] ?? -1, this.t + seconds);
  }

  shielded(kind, system, t = this.t) {
    return (this.shields[kind][system] ?? -1) > t;
  }

  addLingering(system, rate, duration, source) {
    this.lingering.push({ system, rate, until: this.t + duration, source });
  }

  addCrew(district, seconds) {
    this.crews.push({ district, until: this.t + seconds });
  }

  addHazard(district, type, until, source = null) {
    const existing = this.hazards.find((h) => h.district === district && h.type === type);
    if (existing) {
      existing.until = Math.max(existing.until, until);
      if (source) existing.source = source;
    } else {
      this.hazards.push({ district, type, until, source });
    }
  }

  /** Scientist's Rapid Analysis: pre-draw and reveal upcoming crises. */
  revealForecast(n) {
    return this.events.peek(n);
  }

  /** Crises already pre-drawn (only ever non-empty after they were revealed). */
  get forecast() {
    return this.events.forecast;
  }

  hasForesight() {
    return this.perk('seeForecast') || this.predictUntil > this.t;
  }

  /** Data fog (Cyber Emergency, Blind Spots twist): some readings are hidden. */
  fogActive() {
    if (this.perk('seeForecast')) return false;
    return this.rules.some((r) => r.fog && r.fog(this, this.levels));
  }

  isFogged(id) {
    return this.fogSystems.includes(id) && this.fogActive();
  }

  // ------------------------------------------------------------------ model
  /**
   * City stability = the share of city services that are operational (0–100%).
   * A system at 70 or more is fully operational; below that it loses capacity linearly until it
   * is out of service at the failure line (12). Stability is the weighted share across all
   * systems plus a small budget reserve. Because nothing counts above "fully operational",
   * keeping every system healthy beats maxing out a few favorites: the city is only as strong
   * as its weakest links.
   */
  computeStability(levels = this.levels, budget = this.budget) {
    let sum = 0;
    let weight = 0;
    for (const s of SYSTEMS) {
      sum += operational(levels[s.id]) * s.weight;
      weight += s.weight;
    }
    sum += clamp(budget / SIM.budgetReserve, 0, 1) * BUDGET.weight;
    weight += BUDGET.weight;
    return clamp((100 * sum) / weight, 0, 100);
  }

  /** Continuous change per simulated second for every system, given `levels` at time `t`. */
  computeRates(levels = this.levels, t = this.t) {
    const i = this.adaptive.intensity;
    const pressure = tuning.decayMult(i) * (t >= FAST_PHASE ? SIM.finalDecay : 1);
    const spread = tuning.cascadeMult(i) * (t >= IMMINENT_AT ? SIM.imminentCascade : 1);
    const rates = {};
    for (const s of SYSTEMS) {
      const id = s.id;
      let decay = 0;
      if (!this.shielded('decay', id, t)) {
        decay = (SIM.baseDecay + (this.config.decay?.[id] || 0) * SIM.scenarioDecayScale) * pressure * (this.character.decayMult?.[id] ?? 1);
        for (const r of this.rules) if (r.decay) decay *= r.decay(this, id, levels);
        if (id === 'energy' && this.reactorActive) decay *= 0.5;
      }
      let drain = 0;
      for (const dep of s.dependsOn) {
        const source = levels[dep.source];
        if (source >= dep.below || this.shielded('cascade', dep.source, t)) continue;
        drain += dep.strength * ((dep.below - source) / dep.below) * (this.cascadeMults[dep.source] ?? 1);
      }
      rates[id] = -(decay + drain * SIM.dependencyScale * spread * (this.character.resist?.[id] ?? 1));
    }
    for (const l of this.lingering) if (l.until > t) rates[l.system] += l.rate;
    for (const r of this.rules) {
      if (!r.drain) continue;
      const d = r.drain(this, levels);
      if (d) for (const [k, v] of Object.entries(d)) rates[k] += v;
    }
    return rates;
  }

  /**
   * Forward projection of the continuous pressure (no new crises). Pure: it never touches the
   * live state or the RNG. Powers the Predictive Model and the AI Architect's trend readout.
   */
  project(seconds = 60, stepSize = 1, from = this.levels) {
    const levels = { ...from };
    const crossings = [];
    const seen = new Set(SYSTEM_IDS.filter((id) => levels[id] < THRESHOLDS.critical));
    const curve = [{ in: 0, levels: { ...levels } }];
    for (let s = stepSize; s <= seconds + 1e-9; s += stepSize) {
      const rates = this.computeRates(levels, this.t + s);
      for (const id of SYSTEM_IDS) {
        levels[id] = clamp(levels[id] + rates[id] * stepSize, 0, 100);
        if (!seen.has(id) && levels[id] < THRESHOLDS.critical) {
          seen.add(id);
          crossings.push({ system: id, in: s, dependents: DEPENDENTS[id] });
        }
      }
      curve.push({ in: s, levels: { ...levels } });
    }
    return { levels, crossings, curve, stability: this.computeStability(levels) };
  }

  /** Current continuous trend of a system in points per simulated second. */
  trendOf(id) {
    return this.rates[id] ?? 0;
  }

  stabilityAt(t) {
    const s = this.series;
    if (!s.length || t >= this.t) return this.stability;
    if (t <= s[0].t) return s[0].stability;
    let lo = 0;
    let hi = s.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s[mid].t <= t) lo = mid;
      else hi = mid - 1;
    }
    return s[lo].stability;
  }

  criticalSystems() {
    return SYSTEM_IDS.filter((id) => this.levels[id] < THRESHOLDS.critical);
  }

  weakestSystem() {
    let best = SYSTEM_IDS[0];
    for (const id of SYSTEM_IDS) if (this.levels[id] < this.levels[best]) best = id;
    return best;
  }

  // ------------------------------------------------------------------ crises & choices
  responseWindow() {
    let w = this.t >= FAST_PHASE ? SIM.responseWindowFinal : SIM.responseWindow;
    if (tuning.assist(this.adaptive.intensity)) w += SIM.assistWindow;
    return w;
  }

  costOf(choice) {
    const discount = choice.tags.includes('major') ? this.character.majorDiscount ?? 1 : 1;
    return Math.round(choice.cost * discount);
  }

  /** The exact numbers a choice applies right now: what its card shows. */
  previewChoice(choice, ev, underfunded = false) {
    const effects = {};
    const major = choice.tags.includes('major');
    for (const [k, v] of Object.entries(choice.effects)) {
      let x = v;
      if (k !== 'budget') {
        if (v > 0) x = v * SIM.effectScale * (this.character.affinity?.[k] ?? 1) * ev.ease * this.buffs.boost * (underfunded ? SIM.underfunded : 1);
        else x = v * SIM.sideScale * ev.negMult * (major ? this.character.sideEffectMult ?? 1 : 1);
      }
      x = Math.round(x);
      if (x !== 0) effects[k] = x;
    }
    const lingering = choice.lingering.map((l) => ({ ...l }));
    if (major && this.character.majorStrain) lingering.push({ ...this.character.majorStrain });
    if (choice.flags.includes('repair-crew') && this.perk('fastCrews')) lingering.push({ system: 'infrastructure', rate: 0.1, duration: 20 });
    return { effects, lingering };
  }

  buildChoices(ev) {
    const offered = ev.def.choices.filter((c) => !c.role || c.role === this.character.id);
    const choices = offered.map((c, index) => {
      const cost = this.costOf(c);
      const { effects, lingering } = this.previewChoice(c, ev);
      return {
        id: c.id, label: c.label, index, cost, baseCost: c.cost, effects, lingering,
        tags: c.tags, flags: c.flags, role: c.role, risk: c.risk, followUp: c.followUp,
        followUpTitle: c.followUp ? this.eventTitle(c.followUp) : null,
        locked: cost > this.budget + 1e-6, underfunded: false
      };
    });
    // Never leave the commander without a move: if nothing is affordable, the cheapest response
    // can still go ahead underfunded (all remaining budget, half the benefit).
    if (choices.length && choices.every((c) => c.locked)) {
      const cheapest = choices.reduce((a, b) => (b.cost < a.cost ? b : a));
      cheapest.locked = false;
      cheapest.underfunded = true;
      cheapest.effects = this.previewChoice(offered[cheapest.index], ev, true).effects;
    }
    return choices;
  }

  /** Recompute locks/previews (budget changed, an ability boosted the next response). */
  refreshChoices() {
    const ev = this.activeEvent;
    if (!ev) return;
    const key = (list) => JSON.stringify(list.map((c) => [c.locked, c.underfunded, c.effects]));
    const before = key(ev.choices);
    ev.choices = this.buildChoices(ev);
    if (key(ev.choices) !== before) {
      ev.rev++;
      this.emit('event-update', ev);
    }
  }

  activate(entry) {
    const def = EVENT_BY_ID[entry.id];
    if (!def) return;
    this.events.onActivated(def.id);
    const i = this.adaptive.intensity;
    const softened = this.buffs.soften > 0;
    if (softened) this.buffs.soften--;
    const magnitude = Math.round(this.rng.float(0.88, 1.14) * 100) / 100; // every crisis hits a little differently
    const harm = tuning.negativeMult(i) * magnitude * (softened ? SIM.soften : 1);
    const scale = (m, k2) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v * harm * k2)]).filter(([, v]) => v !== 0));
    const ev = {
      id: def.id, def, reason: entry.reason, system: entry.system ?? null,
      startedAt: this.t, clock: clockAt(this.t), window: this.responseWindow(), realElapsed: 0, remaining: 0,
      magnitude, softened, surge: harm >= 1.12, intensity: i, negMult: tuning.negativeMult(i), ease: tuning.ease(i),
      impact: scale(def.impact, SIM.impactScale), ignore: scale(def.ignore || {}, SIM.ignoreScale),
      weakest: this.weakestSystem(), stabilityBefore: this.stability, rev: 0, budgetSeen: Math.floor(this.budget)
    };
    ev.remaining = ev.window;
    this.activeEvent = ev;
    ev.impactApplied = this.applyDeltas(ev.impact);
    ev.choices = this.buildChoices(ev);
    if (def.hazard) this.addHazard(def.district, def.hazard, FOREVER, def.id);
    this.stability = this.computeStability();
    this.emit('event', ev);
  }

  /** Answer the open crisis. Returns the decision record, or null if the choice is unavailable. */
  choose(choiceId, { decisionTime } = {}) {
    const ev = this.activeEvent;
    if (!ev || this.ended) return null;
    const c = ev.choices.find((x) => x.id === choiceId);
    if (!c || c.locked) return null;
    return this.resolve(ev, c, decisionTime ?? ev.realElapsed);
  }

  /** The response timer ran out: the crisis runs its course (its `ignore` consequences). */
  expire() {
    const ev = this.activeEvent;
    if (!ev || this.ended) return null;
    return this.resolve(ev, null, ev.window);
  }

  resolve(ev, c, decisionTime) {
    const snapshot = this.quiet ? null : this.snapshot();
    const levelsBefore = { ...this.levels };
    let applied;
    let paid = 0;
    let followUp = null;
    if (c) {
      paid = this.spend(c.underfunded ? this.budget : c.cost);
      applied = this.applyDeltas(c.effects);
      for (const l of c.lingering) this.addLingering(l.system, l.rate, l.duration, ev.id);
      for (const f of c.flags) this.flags.add(f);
      if (c.flags.includes('repair-crew')) this.addCrew(ev.def.district, SIM.crewTime);
      if (c.followUp && c.risk > 0 && this.riskRng.chance(c.risk) && this.events.raiseFollowUp(c.followUp, this.riskRng.float(8, 14))) {
        followUp = c.followUp;
      }
      this.buffs.boost = 1;
    } else {
      applied = this.applyDeltas(ev.ignore);
    }
    // the crisis site calms down after the response (faster with repair crews, slower if ignored)
    const linger = !c ? SIM.hazardLingerIgnored : c.flags.includes('repair-crew') ? (this.perk('fastCrews') ? 4 : 7) : SIM.hazardLinger;
    for (const h of this.hazards) if (h.source === ev.id) h.until = this.t + linger;
    this.stability = this.computeStability();

    // reaction to failures: a cascade crisis answered with a direct fix of the failing system
    const cascade = ev.reason === 'cascade' ? this.cascades.findLast((k) => k.from === ev.system) : null;
    if (cascade) cascade.answered = !!c;
    const effects = c ? c.effects : ev.ignore;
    const open = ev.choices.filter((x) => !x.locked);
    const decision = {
      index: this.decisions.length, t: this.t, clock: ev.clock, resolvedClock: clockAt(this.t),
      eventId: ev.id, title: ev.def.title, category: ev.def.category, district: ev.def.district,
      severity: ev.def.severity, kind: ev.def.kind, reason: ev.reason, system: ev.system,
      choiceId: c?.id ?? null, label: c?.label ?? 'No response', ignored: !c, underfunded: !!c?.underfunded,
      effects, applied, cost: Math.round(paid), lingering: c?.lingering ?? [], tags: c?.tags ?? [],
      risk: c ? riskScore(c, effects) : 0, followUp,
      decisionTime: round1(decisionTime),
      stabilityBefore: round1(ev.stabilityBefore), stabilityAfter: round1(this.stability), stabilityLater: null,
      levelsBefore: roundLevels(levelsBefore), levelsAfter: roundLevels(this.levels), levelsLater: null,
      options: ev.choices.map((x) => ({ id: x.id, label: x.label, cost: x.cost, locked: x.locked, underfunded: x.underfunded, effects: { ...x.effects } })),
      snapshot
    };
    this.decisions.push(decision);
    this.analysis.recordDecision({
      ignored: !c,
      effects,
      decisionTime: decision.decisionTime,
      risk: decision.risk,
      cost: paid,
      tags: decision.tags,
      category: ev.def.category,
      kind: ev.def.kind,
      choiceId: c?.id ?? null,
      choiceIndex: c ? c.index : -1,
      weakest: ev.weakest,
      afterCascade: !!cascade,
      addressedCascade: !!c && !!cascade && (effects[cascade.from] ?? 0) > 0,
      options: open.map((x) => ({ id: x.id, cost: x.cost, risk: x.risk, tags: x.tags, effects: x.effects }))
    });
    this.log.push({ type: 'decision', t: this.t, clock: ev.clock, index: decision.index });
    this.activeEvent = null;
    this.quietUntil = this.t + SIM.breather;
    this.emit('resolved', decision);
    return decision;
  }

  // ------------------------------------------------------------------ special ability
  abilityState() {
    const a = this.ability;
    const wait = Math.max(0, a.readyAt - this.t);
    return { ...a, wait, ready: !this.ended && a.charges > 0 && wait <= 0 };
  }

  canUseAbility() {
    return this.abilityState().ready;
  }

  useAbility() {
    if (!this.canUseAbility()) return null;
    const a = this.ability;
    const before = this.stability;
    const report = ABILITIES[a.id](this);
    a.charges--;
    a.uses++;
    a.readyAt = this.t + a.cooldown;
    this.stability = this.computeStability();
    this.analysis.recordAbility({ t: this.t, stability: before });
    const entry = { type: 'ability', t: this.t, clock: clockAt(this.t), id: a.id, name: a.name, effects: report.effects, text: report.text };
    this.log.push(entry);
    if (this.activeEvent) this.refreshChoices();
    this.emit('ability', { ...entry, report });
    return report;
  }

  // ------------------------------------------------------------------ time
  update(realDt) {
    if (this.ended) return;
    const dt = Math.min(SIM.maxFrame, Math.max(0, realDt));
    const ev = this.activeEvent;
    if (ev) {
      ev.realElapsed += dt;
      ev.remaining = Math.max(0, ev.window - ev.realElapsed);
      if (Math.floor(this.budget) !== ev.budgetSeen) {
        ev.budgetSeen = Math.floor(this.budget);
        this.refreshChoices();
      }
      if (ev.remaining <= 0) this.expire();
    }
    this.acc += dt * (this.activeEvent ? CLOCK.decisionDilation : 1);
    while (this.acc >= SIM.step - 1e-9 && !this.ended) {
      this.acc -= SIM.step;
      const calm = !this.activeEvent;
      this.step();
      // a crisis just arrived: the rest of this frame already runs in slow motion
      if (calm && this.activeEvent) this.acc *= CLOCK.decisionDilation;
    }
  }

  step() {
    const dt = SIM.step;
    this.ticks++;
    this.t = Math.round(this.ticks * dt * 1000) / 1000;

    // 1–3 continuous pressure, dependency drain, lingering effects, income
    this.rates = this.computeRates();
    for (const id of SYSTEM_IDS) this.levels[id] = clamp(this.levels[id] + this.rates[id] * dt, 0, 100);
    const before = this.budget;
    this.budget = Math.min(SIM.budgetCap, this.budget + SIM.budgetRegen * this.budgetRegenMult * dt);
    this.budgetEarned += this.budget - before;
    if (this.ticks % TICKS_PER_SECOND === 0) this.prune();

    // 4 thresholds and cascades
    this.checkThresholds();

    // 5 rules, stability, adaptation, history
    this.runRules();
    this.stability = this.computeStability();
    this.minStability = Math.min(this.minStability, this.stability);
    this.peakStability = Math.max(this.peakStability, this.stability);
    if (!this.adaptiveFrozen) {
      const change = this.adaptive.update(this, dt);
      if (change) {
        this.log.push({ type: 'adaptive', t: this.t, clock: clockAt(this.t), ...change });
        if (!this.quiet) this.analyst.adaptiveChange(change);
        this.emit('adaptive', change);
      }
    }
    this.measureDecisions();
    if (this.ticks % TICKS_PER_SAMPLE === 0) this.sample();
    while (this.phaseIndex < PHASES.length && this.t >= PHASES[this.phaseIndex].at - 1e-9) {
      const p = PHASES[this.phaseIndex++];
      this.log.push({ type: 'phase', t: this.t, clock: clockAt(this.t), id: p.id, title: p.title });
      this.emit('phase', p);
    }

    if (this.checkCollapse(dt)) return;
    if (this.t >= SESSION_LENGTH - 1e-9) {
      this.end('survived');
      return;
    }

    // next crisis (never in the final seconds, always after a short breather)
    if (!this.activeEvent && this.t >= this.quietUntil && this.t < SESSION_LENGTH - SIM.eventCutoff) {
      const next = this.events.update();
      if (next) this.activate(next);
    }

    // command-AI observations
    if (!this.quiet) {
      const msg = this.analyst.update(dt);
      if (msg) {
        this.messages.push(msg);
        this.emit('message', msg);
      }
    }
  }

  prune() {
    const t = this.t;
    this.lingering = this.lingering.filter((l) => l.until > t);
    this.hazards = this.hazards.filter((h) => h.until > t);
    this.crews = this.crews.filter((c) => c.until > t);
  }

  checkThresholds() {
    for (const id of SYSTEM_IDS) {
      const level = this.levels[id];
      if (level < this.minLevels[id]) this.minLevels[id] = level;
      const zone = this.zone[id];
      if (zone === 'ok') {
        if (level < THRESHOLDS.critical) {
          this.zone[id] = 'critical';
          this.onCritical(id);
        }
      } else if (zone === 'critical') {
        if (level < THRESHOLDS.failure) {
          this.zone[id] = 'failed';
          this.onFailure(id);
        } else if (level >= THRESHOLDS.critical + SIM.recoverMargin) {
          this.zone[id] = 'ok';
          this.emit('recovered', { system: id, t: this.t });
        }
      } else if (level >= THRESHOLDS.failure + SIM.recoverMargin / 2) {
        this.zone[id] = 'critical';
      }
    }
  }

  onCritical(id) {
    const base = { t: this.t, clock: clockAt(this.t), system: id };
    if (this.shielded('cascade', id)) {
      this.blocked.push({ t: this.t, system: id });
      this.log.push({ ...base, type: 'blocked' });
      if (!this.quiet) this.analyst.push('update', `${this.systemName(id)} dropped to critical, but the failure is contained. It cannot spread right now.`, { urgent: true });
      this.emit('cascade-blocked', base);
      return;
    }
    const cascade = { t: this.t, clock: clockAt(this.t), from: id, to: DEPENDENTS[id], answered: false, raised: false };
    cascade.raised = this.events.raiseCascade(id);
    this.cascades.push(cascade);
    this.log.push({ ...base, type: 'cascade', to: cascade.to });
    if (!this.quiet) this.analyst.cascade(id, cascade.to[0]);
    this.emit('cascade', cascade);
  }

  onFailure(id) {
    this.criticalFailures++;
    const entry = { type: 'failure', t: this.t, clock: clockAt(this.t), system: id };
    this.log.push(entry);
    if (!this.quiet) this.analyst.push('warning', `${this.systemName(id)} has failed. Everything that depends on it is draining fast.`, { urgent: true });
    this.emit('failure', entry);
  }

  runRules() {
    for (const r of this.rules) {
      if (!r.periodic || this.ticks % Math.round(r.periodic.every / SIM.step) !== 0) continue;
      const report = r.periodic.fn(this);
      if (!report) continue;
      if (report.hazard) this.addHazard(report.district, report.hazard, this.t + 10);
      const entry = { type: 'rule', t: this.t, clock: clockAt(this.t), rule: r.id, ...report };
      this.log.push(entry);
      this.emit('rule', entry);
    }
  }

  /** Fill in each decision's delayed impact (for the timeline and the report highlights). */
  measureDecisions() {
    for (let k = this.decisions.length - 1; k >= 0; k--) {
      const d = this.decisions[k];
      if (d.stabilityLater !== null) break;
      if (this.t >= d.t + SIM.laterDelay) {
        d.stabilityLater = round1(this.stability);
        d.levelsLater = roundLevels(this.levels);
      }
    }
  }

  checkCollapse(dt) {
    if (this.stability < SIM.collapseStability) {
      if (this.collapseTimer === 0) {
        if (!this.quiet) this.analyst.push('warning', `City stability below ${SIM.collapseStability}%. Collapse in ${SIM.collapseAfter} s unless systems recover!`, { urgent: true });
        this.emit('collapse-warning', { seconds: SIM.collapseAfter });
      }
      this.collapseTimer += dt;
      if (this.collapseTimer >= SIM.collapseAfter - 1e-9) {
        this.end('collapsed');
        return true;
      }
    } else if (this.collapseTimer > 0 && this.stability >= SIM.collapseStability + 3) {
      this.collapseTimer = 0;
      this.emit('collapse-averted', { t: this.t });
    }
    return false;
  }

  sample() {
    const s = { t: this.t, clock: clockAt(this.t), stability: round1(this.stability), levels: roundLevels(this.levels), budget: round1(this.budget), intensity: this.adaptive.intensity };
    const last = this.series.at(-1);
    if (last && last.t === this.t) this.series[this.series.length - 1] = s;
    else this.series.push(s);
  }

  end(outcome) {
    if (this.ended) return;
    if (this.activeEvent) {
      const ev = this.activeEvent;
      this.activeEvent = null;
      this.emit('event-cancelled', ev);
    }
    this.ended = true;
    this.outcome = outcome;
    this.endedAt = this.t;
    this.stability = this.computeStability();
    this.measureDecisions();
    for (const d of this.decisions) {
      if (d.stabilityLater === null) {
        d.stabilityLater = round1(this.stability);
        d.levelsLater = roundLevels(this.levels);
      }
    }
    this.sample();
    this.log.push({ type: 'end', t: this.t, clock: clockAt(this.t), outcome });
    this.emit('end', { outcome, t: this.t });
  }

  // ------------------------------------------------------------------ views
  /** Everything the city renderer needs (see CityView.applyState). */
  getView() {
    const hazards = this.hazards.filter((h) => h.until > this.t).map(({ district, type }) => ({ district, type }));
    for (const r of this.rules) {
      const h = r.hazard?.(this);
      if (h && !hazards.some((x) => x.district === h.district && x.type === h.type)) hazards.push(h);
    }
    const pins = [];
    if (this.activeEvent) pins.push({ district: this.activeEvent.def.district, kind: this.activeEvent.def.severity >= 3 ? 'critical' : 'warning' });
    return {
      levels: { ...this.levels, budget: this.budget },
      stability: this.stability,
      night: nightAt(this.t),
      hazards,
      pins,
      weather: this.config.weather || null,
      gridShield: this.shielded('cascade', 'energy'),
      reactorActive: this.reactorActive,
      repairCrews: this.crews.filter((c) => c.until > this.t).length
    };
  }

  // ------------------------------------------------------------------ snapshots (What-If)
  snapshot() {
    const ev = this.activeEvent;
    return {
      ticks: this.ticks, t: this.t, acc: this.acc,
      levels: { ...this.levels },
      budget: this.budget, budgetStart: this.budgetStart, budgetEarned: this.budgetEarned, budgetSpent: this.budgetSpent,
      flags: [...this.flags],
      lingering: copyList(this.lingering), hazards: copyList(this.hazards), crews: copyList(this.crews),
      shields: { cascade: { ...this.shields.cascade }, decay: { ...this.shields.decay } },
      ability: { ...this.ability }, buffs: { ...this.buffs },
      predictUntil: this.predictUntil, reactorActive: this.reactorActive,
      zone: { ...this.zone }, minLevels: { ...this.minLevels },
      collapseTimer: this.collapseTimer, phaseIndex: this.phaseIndex, quietUntil: this.quietUntil,
      criticalFailures: this.criticalFailures, stability: this.stability,
      minStability: this.minStability, peakStability: this.peakStability,
      rng: this.rng.getState(), riskRng: this.riskRng.getState(),
      activeEvent: ev
        ? {
            ...ev, def: null,
            impact: { ...ev.impact }, ignore: { ...ev.ignore }, impactApplied: { ...ev.impactApplied },
            choices: ev.choices.map((c) => ({ ...c, effects: { ...c.effects }, lingering: copyList(c.lingering) }))
          }
        : null,
      events: this.events.snapshot(),
      adaptive: this.adaptive.snapshot(),
      analyst: this.analyst.snapshot(),
      cascades: this.cascades.slice(-8).map((c) => ({ ...c, to: [...c.to] })),
      blocked: copyList(this.blocked),
      series: this.series.slice(-16).map((s) => ({ ...s, levels: { ...s.levels } }))
    };
  }

  restore(s) {
    this.ticks = s.ticks;
    this.t = s.t;
    this.acc = s.acc;
    this.levels = { ...s.levels };
    this.budget = s.budget;
    this.budgetStart = s.budgetStart;
    this.budgetEarned = s.budgetEarned;
    this.budgetSpent = s.budgetSpent;
    this.flags = new Set(s.flags);
    this.lingering = copyList(s.lingering);
    this.hazards = copyList(s.hazards);
    this.crews = copyList(s.crews);
    this.shields = { cascade: { ...s.shields.cascade }, decay: { ...s.shields.decay } };
    this.ability = { ...s.ability };
    this.buffs = { ...s.buffs };
    this.predictUntil = s.predictUntil;
    this.reactorActive = s.reactorActive;
    this.zone = { ...s.zone };
    this.minLevels = { ...s.minLevels };
    this.collapseTimer = s.collapseTimer;
    this.phaseIndex = s.phaseIndex;
    this.quietUntil = s.quietUntil;
    this.criticalFailures = s.criticalFailures;
    this.stability = s.stability;
    this.minStability = s.minStability;
    this.peakStability = s.peakStability;
    this.rng.setState(s.rng);
    this.riskRng.setState(s.riskRng);
    this.activeEvent = s.activeEvent
      ? {
          ...s.activeEvent, def: EVENT_BY_ID[s.activeEvent.id],
          impact: { ...s.activeEvent.impact }, ignore: { ...s.activeEvent.ignore }, impactApplied: { ...s.activeEvent.impactApplied },
          choices: s.activeEvent.choices.map((c) => ({ ...c, effects: { ...c.effects }, lingering: copyList(c.lingering) }))
        }
      : null;
    this.events.restore(s.events);
    this.adaptive.restore(s.adaptive);
    this.analyst.restore(s.analyst);
    this.cascades = s.cascades.map((c) => ({ ...c, to: [...c.to] }));
    this.blocked = copyList(s.blocked);
    this.series = s.series.map((x) => ({ ...x, levels: { ...x.levels } }));
    this.decisions = [];
    this.log = [];
    this.messages = [];
    this.ended = false;
    this.outcome = null;
    this.endedAt = null;
    this.rates = this.computeRates();
    return this;
  }
}

export { SESSION_LENGTH, FAST_PHASE };
