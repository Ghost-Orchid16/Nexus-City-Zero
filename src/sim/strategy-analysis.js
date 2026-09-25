/**
 * GAMEPLAY STRATEGY ANALYSIS: derives a play style from what the commander actually did.
 *
 * Not a personality test. Every signal is measured from decisions, and each decision is judged
 * RELATIVE TO THE ALTERNATIVES ON THE CARD, so the crises you happened to face don't decide your
 * style: picking the most people-oriented option of a power crisis still counts as
 * people-first. Signals tracked:
 *   decision speed · risk-taking · resource conservation · preferred systems · special-ability
 *   use · repeated decision patterns · reaction to failures (cascades) · strategy changes
 * The explanation lines on the results screen quote these numbers.
 */
import { PEOPLE_SYSTEMS, CITY_SYSTEMS, RESOURCE_BY_ID } from '../data/resources.js';
import { clamp01, sigmoid, inverseLerp01, compensatedProduct } from './curves.js';

export const STYLES = {
  planner: { name: 'Strategic Planner', blurb: 'You took your time, weighed the trade-offs and steered away from gambles.' },
  risk: { name: 'Risk Taker', blurb: 'You went for bold, high-stakes responses and accepted side effects for big gains.' },
  optimizer: { name: 'Resource Optimizer', blurb: 'You protected the emergency budget and got the most out of low-cost responses.' },
  responder: { name: 'Crisis Responder', blurb: 'You reacted fast and went straight for whatever was failing right now.' },
  infrastructure: { name: 'Infrastructure Specialist', blurb: 'You kept the machinery of the city running: power, water, roads and networks.' },
  humanitarian: { name: 'Humanitarian Commander', blurb: 'You put people first: health, safety and supplies came before everything else.' },
  adaptive: { name: 'Adaptive Commander', blurb: 'You changed strategy as consequences hit and handled many kinds of crises.' }
};

/** Below this many answered crises there is too little evidence to name a play style. */
export const MIN_DECISIONS = 3;

/** Reported instead of a play style when too few crises were answered to measure one. */
export const NO_STYLE = {
  name: 'Not Enough Decisions',
  blurb: `A play style is measured from your choices, and it takes at least ${MIN_DECISIONS} answered crises to read one.`
};

/** How risky a response is: explicit follow-up risk + size of its side effects + boldness. */
export function riskScore(choice, effects = choice?.effects || {}) {
  const neg = Object.entries(effects).filter(([k, v]) => k !== 'budget' && v < 0).reduce((s, [, v]) => s - v, 0);
  return clamp01((choice?.risk || 0) + neg / 40 + (choice?.tags?.includes('bold') ? 0.18 : 0));
}

function gains(effects) {
  let people = 0;
  let city = 0;
  for (const [k, v] of Object.entries(effects)) {
    if (v <= 0 || k === 'budget') continue;
    if (PEOPLE_SYSTEMS.includes(k)) people += v;
    else if (CITY_SYSTEMS.includes(k)) city += v;
  }
  return { people, city, total: people + city };
}

/** −1 = all gains to city machinery … +1 = all gains to people-facing systems. */
function orientation(effects) {
  const g = gains(effects);
  return g.total ? (g.people - g.city) / g.total : 0;
}

/** How a detected strategy change is described: [value went down, value went up]. */
const SHIFT_TEXT = {
  orientation: ['You switched from people-first to city-first responses as the crisis unfolded.', 'You switched from city-first to people-first responses as the crisis unfolded.'],
  cost: ['You moved from expensive to low-cost responses as the crisis unfolded.', 'You moved from low-cost to expensive responses as the crisis unfolded.'],
  risk: ['You moved from bold to careful responses as the crisis unfolded.', 'You moved from careful to bold responses as the crisis unfolded.']
};

const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
const rel = (value, values) => {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return hi - lo > 1e-6 ? (value - lo) / (hi - lo) : null;
};

export class StrategyAnalysis {
  constructor() {
    this.decisions = [];
    this.abilities = [];
  }

  /**
   * @param {object} d decision facts from the simulation: ignored, effects, decisionTime, cost,
   *   risk, tags, category, kind, choiceId, choiceIndex, weakest, afterCascade, addressedCascade,
   *   options (the affordable alternatives, each {id, cost, risk, tags, effects})
   */
  recordDecision(d) {
    const record = { ...d, rel: null };
    const options = d.options || [];
    if (!d.ignored && options.length >= 2) {
      const chosen = options.find((o) => o.id === d.choiceId);
      if (chosen) {
        const risks = options.map((o) => riskScore(o, o.effects));
        const toWeakest = options.map((o) => Math.max(0, o.effects[d.weakest] || 0));
        const bestForWeakest = Math.max(...toWeakest);
        const extra = {};
        for (const k of [...PEOPLE_SYSTEMS, ...CITY_SYSTEMS]) {
          const avg = mean(options.map((o) => Math.max(0, o.effects[k] || 0)));
          const x = Math.max(0, chosen.effects[k] || 0) - avg;
          if (x > 0.01) extra[k] = x;
        }
        record.rel = {
          orientation: orientation(chosen.effects) - mean(options.map((o) => orientation(o.effects))),
          cost: rel(chosen.cost, options.map((o) => o.cost)),
          risk: rel(riskScore(chosen, chosen.effects), risks),
          lowest: bestForWeakest > 0 ? ((chosen.effects[d.weakest] || 0) >= bestForWeakest ? 1 : 0) : null,
          extra
        };
      }
    }
    this.decisions.push(record);
  }

  recordAbility(a) {
    this.abilities.push(a);
  }

  metrics(sim) {
    const all = this.decisions;
    const ds = all.filter((d) => !d.ignored);
    const n = ds.length;
    const pick = (list, key) => list.map((d) => d.rel?.[key]).filter((v) => v !== null && v !== undefined);
    const avgOr = (list, key, fallback) => mean(pick(list, key)) ?? fallback;

    // which systems the commander favored beyond what the alternatives offered
    const extra = {};
    for (const d of ds) for (const [k, v] of Object.entries(d.rel?.extra || {})) extra[k] = (extra[k] || 0) + v;
    const topSystem = Object.entries(extra).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    let people = 0;
    let city = 0;
    for (const d of ds) {
      const g = gains(d.effects);
      people += g.people;
      city += g.city;
    }
    const focusTotal = people + city || 1;

    // strategy change: did a style signal move between the first and second half of the run?
    // Measured as an effect size (difference in means over the pooled spread), so the natural
    // variety of crises does not look like a change of strategy.
    const half = Math.floor(n / 2);
    const first = ds.slice(0, half);
    const second = ds.slice(half);
    const variance = (arr) => {
      const mu = mean(arr);
      return arr.reduce((s2, x) => s2 + (x - mu) * (x - mu), 0) / arr.length;
    };
    let shiftInfo = { key: null, d: 0, from: 0, to: 0 };
    for (const key of ['orientation', 'cost', 'risk']) {
      const a = pick(first, key);
      const b = pick(second, key);
      if (a.length < 3 || b.length < 3) continue;
      const d = (mean(b) - mean(a)) / Math.sqrt((variance(a) + variance(b)) / 2 + 0.02);
      if (Math.abs(d) > Math.abs(shiftInfo.d)) shiftInfo = { key, d, from: mean(a), to: mean(b) };
    }
    const shift = clamp01(Math.abs(shiftInfo.d) / 3);

    // repeated patterns: longest run of the same option slot, and the most repeated tag
    let streak = 1;
    let best = n ? 1 : 0;
    for (let i = 1; i < n; i++) {
      streak = ds[i].choiceIndex === ds[i - 1].choiceIndex ? streak + 1 : 1;
      best = Math.max(best, streak);
    }
    const tagCounts = {};
    for (const d of ds) for (const t of d.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
    const [dominantTag, dominantCount] = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0] || [null, 0];

    const afterCascade = ds.filter((d) => d.afterCascade);
    const spent = ds.reduce((s, d) => s + d.cost, 0);
    return {
      decisions: n,
      ignored: all.length - n,
      avgDecisionTime: mean(ds.map((d) => d.decisionTime)) ?? 0,
      riskAvg: mean(ds.map((d) => d.risk)) ?? 0,
      riskyChoices: ds.filter((d) => d.risk >= 0.35).length,
      riskBias: avgOr(ds, 'risk', 0.5),
      costBias: avgOr(ds, 'cost', 0.5),
      orientation: avgOr(ds, 'orientation', 0),
      lowestShare: avgOr(ds, 'lowest', 0),
      spent,
      budgetAvailable: sim.budgetEarned,
      spendRatio: sim.budgetEarned ? spent / sim.budgetEarned : 0,
      cheapShare: n ? pick(ds, 'cost').filter((v) => v <= 0.01).length / Math.max(1, pick(ds, 'cost').length) : 0,
      peopleShare: people / focusTotal,
      cityShare: city / focusTotal,
      topSystem,
      cascades: sim.cascades.length,
      cascadeAnswered: afterCascade.filter((d) => d.addressedCascade).length,
      cascadeFollowed: afterCascade.length,
      strategyShift: shift,
      shiftKey: shiftInfo.key,
      shiftUp: shiftInfo.d > 0,
      categories: new Set(ds.filter((d) => d.kind !== 'recovery').map((d) => d.category)).size,
      abilityUses: this.abilities.length,
      abilityUnderPressure: this.abilities.filter((x) => x.stability < 70).length,
      patternStreak: best,
      dominantTag,
      dominantShare: n ? dominantCount / n : 0,
      preventiveShare: n ? ds.filter((d) => d.tags.includes('preventive')).length / n : 0
    };
  }

  scores(m) {
    if (m.decisions === 0) return { planner: 0, risk: 0, optimizer: 0, responder: 0, infrastructure: 0, humanitarian: 0, adaptive: 0 };
    const slow = inverseLerp01(m.avgDecisionTime, 5, 12);
    const fast = 1 - inverseLerp01(m.avgDecisionTime, 2.5, 7);
    // reaction to failures: neutral when no cascade crisis happened, otherwise the share fixed at the source
    const cascadeFix = m.cascadeFollowed ? 0.6 + 0.4 * (m.cascadeAnswered / m.cascadeFollowed) : 0.85;
    return {
      planner: compensatedProduct([sigmoid(slow, 8, 0.45), 1 - sigmoid(m.riskBias, 10, 0.45), 1 - m.ignored / Math.max(1, m.decisions + m.ignored)]),
      risk: compensatedProduct([sigmoid(m.riskBias, 10, 0.62), inverseLerp01(m.riskyChoices, 1, 4)]),
      optimizer: compensatedProduct([1 - sigmoid(m.costBias, 10, 0.32), 1 - sigmoid(m.spendRatio, 8, 0.62)]),
      responder: compensatedProduct([sigmoid(fast, 8, 0.5), sigmoid(m.lowestShare, 9, 0.6)]),
      infrastructure: compensatedProduct([sigmoid(-m.orientation, 14, 0.2), 0.88]),
      humanitarian: compensatedProduct([sigmoid(m.orientation, 14, 0.2), 0.88]),
      adaptive: compensatedProduct([sigmoid(m.strategyShift, 12, 0.42), cascadeFix, inverseLerp01(m.categories, 3, 7)])
    };
  }

  classify(sim) {
    const m = this.metrics(sim);
    const scores = this.scores(m);
    if (m.decisions < MIN_DECISIONS) {
      return { style: null, name: NO_STYLE.name, blurb: NO_STYLE.blurb, scores, runnerUp: null, metrics: m, reasons: this.sparseReasons(m) };
    }
    const ranked = Object.entries(scores).sort((x, y) => y[1] - x[1]);
    const style = ranked[0][0];
    return { style, name: STYLES[style].name, blurb: STYLES[style].blurb, scores, runnerUp: ranked[1][0], metrics: m, reasons: this.reasons(style, m) };
  }

  /** Evidence lines quoting real statistics from the run. */
  reasons(style, m) {
    const pct = (x) => `${Math.round(x * 100)}%`;
    const secs = (x) => `${x.toFixed(1)} s`;
    const top = m.topSystem ? RESOURCE_BY_ID[m.topSystem].name : null;
    const lean = (x) => `${Math.round(Math.abs(x) * 100)}%`;
    const lines = {
      planner: [
        `Average decision time: ${secs(m.avgDecisionTime)}, time you used to weigh the options.`,
        `Your choices carried less risk than the alternatives (${pct(1 - m.riskBias)} of the way to the safest option).`,
        m.preventiveShare > 0 ? `${pct(m.preventiveShare)} of your responses were preventive.` : null
      ],
      risk: [
        `${m.riskyChoices} of ${m.decisions} responses were high-risk.`,
        `You leaned toward the boldest option on the card (${pct(m.riskBias)} risk preference).`
      ],
      optimizer: [
        `You spent ${pct(m.spendRatio)} of the emergency budget available to you.`,
        `${pct(m.cheapShare)} of your choices were the cheapest option on the card.`
      ],
      responder: [
        `Average decision time: ${secs(m.avgDecisionTime)}.`,
        `${pct(m.lowestShare)} of your responses gave the most help to the weakest system.`
      ],
      infrastructure: [
        `Your choices leaned ${lean(m.orientation)} toward power, water, transport, infrastructure and networks.`,
        top ? `The system you favored most: ${top}.` : null
      ],
      humanitarian: [
        `Your choices leaned ${lean(m.orientation)} toward health, safety and supplies.`,
        top ? `The system you favored most: ${top}.` : null
      ],
      adaptive: [
        SHIFT_TEXT[m.shiftKey]?.[m.shiftUp ? 1 : 0] ?? 'Your approach changed as the crisis unfolded.',
        m.cascadeFollowed ? `You answered ${m.cascadeAnswered} of ${m.cascadeFollowed} cascade situations at their source.` : null,
        `You handled ${m.categories} different kinds of crisis.`
      ]
    };
    const extra = [];
    if (m.abilityUses) extra.push(`Special ability used ${m.abilityUses}×${m.abilityUnderPressure ? `, ${m.abilityUnderPressure} under pressure` : ''}.`);
    if (m.patternStreak >= 4) extra.push(`Repeated pattern: the same option slot ${m.patternStreak} times in a row.`);
    const common = [`Decisions made: ${m.decisions}${m.ignored ? ` (${m.ignored} missed)` : ''}.`];
    return [...lines[style].filter(Boolean), ...extra, ...common].slice(0, 4);
  }

  /** What can honestly be said about a run with too few answered crises. */
  sparseReasons(m) {
    const crises = m.decisions + m.ignored;
    return [
      `You answered ${m.decisions} of ${crises} ${crises === 1 ? 'crisis' : 'crises'}.`,
      m.ignored ? `${m.ignored} ${m.ignored === 1 ? 'crisis' : 'crises'} ran out of time, so the damage played out unchecked.` : null,
      m.cascades ? `${m.cascades} cascade${m.cascades === 1 ? '' : 's'} spread from failing systems to the ones that depend on them.` : null,
      m.abilityUses ? `Special ability used ${m.abilityUses}×.` : 'Your special ability was never used.'
    ].filter(Boolean);
  }
}
