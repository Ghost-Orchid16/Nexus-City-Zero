/**
 * Run configuration: turns the player's picks (role + crisis theme, or the dice buttons) into the
 * plain-data config the Simulation consumes. Everything is derived from one seed, so a run can be
 * reproduced, and randomization stays inside balanced ranges.
 *
 * - Theme runs use the scenario's authored start levels, pressure, deck weights, rule and opening.
 * - 🎲 RANDOMIZE EVERYTHING also randomizes the role, theme, starting city, budget, opening crisis,
 *   event order (the seed) and adds a secondary crisis condition.
 * - 🎲 CHAOS MODE blends two random themes (both rules active) plus a surprise twist.
 */
import { RNG, freshSeed } from '../core/rng.js';
import { CHARACTERS, CHARACTER_BY_ID } from '../data/characters.js';
import { SCENARIO_BY_ID, CHAOS_TWISTS, DEFAULT_START, DEFAULT_BUDGET, PLAYABLE_THEMES } from '../data/scenarios.js';
import { SYSTEM_IDS } from '../data/resources.js';
import { DECK } from '../data/events/index.js';
import { commanderName } from '../data/commander-names.js';

export const CONFIG_VERSION = 1;

/** Balanced ranges for randomized starts: crisis systems stay in trouble, the rest stay playable. */
export const RANDOM_RANGES = {
  crisis: { spread: 6, min: 36, max: 54 },
  normal: { spread: 10, min: 52, max: 84 },
  budget: { min: -12, max: 18 }
};

const FOG_RULES = ['data-fog', 'blind-spots'];
const clampInt = (v, lo, hi) => Math.round(Math.min(hi, Math.max(lo, v)));

function themeSetup(scn) {
  return {
    ids: [scn.id],
    start: { ...DEFAULT_START, ...scn.start },
    crisisSystems: Object.keys(scn.start),
    decay: { ...scn.decay },
    themes: { ...scn.themes },
    rules: [scn.rule.id],
    twist: null,
    opening: scn.opening,
    weather: scn.weather || null
  };
}

/** Chaos Mode: two crises at once plus a twist. Each crisis starts a little milder than alone. */
function chaosBlend(rng) {
  const [a, b] = rng.shuffle(PLAYABLE_THEMES).slice(0, 2).map((id) => SCENARIO_BY_ID[id]);
  const start = {};
  const crisisSystems = [];
  for (const id of SYSTEM_IDS) {
    const va = a.start[id];
    const vb = b.start[id];
    if (va !== undefined || vb !== undefined) {
      start[id] = Math.min(va ?? 100, vb ?? 100) + 4;
      crisisSystems.push(id);
    } else {
      start[id] = DEFAULT_START[id] + rng.int(-8, 6);
    }
  }
  const decay = {};
  for (const id of SYSTEM_IDS) {
    const sum = (a.decay[id] || 0) + (b.decay[id] || 0);
    if (sum) decay[id] = Math.round(sum * 0.8 * 1000) / 1000;
  }
  const themes = { ...a.themes };
  for (const [k, v] of Object.entries(b.themes)) themes[k] = Math.max(themes[k] || 1, v);
  return {
    ids: [a.id, b.id],
    start,
    crisisSystems,
    decay,
    themes,
    rules: [a.rule.id, b.rule.id],
    twist: rng.pick(CHAOS_TWISTS).id,
    opening: rng.pick([a.opening, b.opening]),
    weather: a.weather || b.weather || null
  };
}

/** A theme-appropriate opening crisis whose conditions hold at the start. */
function pickOpening(rng, base, start) {
  const pool = DECK.filter((d) =>
    d.kind === 'deck' && d.severity >= 2 &&
    d.themes.some((t) => base.themes[t] > 1) &&
    d.when.every(([sys, op, v]) => (op === '<' ? start[sys] < v : start[sys] > v))
  );
  const pick = rng.weighted(pool, (d) => Math.max(...d.themes.map((t) => base.themes[t] || 1)));
  return pick ? pick.id : base.opening;
}

/**
 * @param {{character: string, scenario: string, seed?: number|string, randomize?: boolean}} picks
 */
export function createRunConfig({ character, scenario, seed = freshSeed(), randomize = false }) {
  const role = CHARACTER_BY_ID[character];
  if (!role) throw new Error(`Unknown character: ${character}`);
  if (scenario !== 'chaos' && !SCENARIO_BY_ID[scenario]) throw new Error(`Unknown scenario: ${scenario}`);
  const rng = new RNG(`${seed}:setup`);
  const chaos = scenario === 'chaos';
  const base = chaos ? chaosBlend(rng) : themeSetup(SCENARIO_BY_ID[scenario]);
  const start = { ...base.start };
  let budget = DEFAULT_BUDGET;
  let twist = base.twist;
  let opening = base.opening;

  if (randomize) {
    for (const id of SYSTEM_IDS) {
      const r = base.crisisSystems.includes(id) ? RANDOM_RANGES.crisis : RANDOM_RANGES.normal;
      start[id] = clampInt(start[id] + rng.int(-r.spread, r.spread), r.min, r.max);
    }
    budget += rng.int(RANDOM_RANGES.budget.min, RANDOM_RANGES.budget.max);
    if (!twist) twist = rng.pick(CHAOS_TWISTS).id; // secondary crisis condition
    opening = pickOpening(rng, base, start);
  }
  if (twist === 'tight-budget') budget -= 20;
  budget = Math.max(20, budget) + role.startBudget;

  const rules = [...new Set([...base.rules, twist].filter(Boolean))];
  const fogSystems = rules.some((r) => FOG_RULES.includes(r))
    ? rng.shuffle(SYSTEM_IDS.filter((id) => id !== 'communication')).slice(0, 3)
    : [];

  return {
    version: CONFIG_VERSION,
    seed,
    character,
    scenario,
    scenarioIds: base.ids,
    chaos,
    randomized: randomize,
    twist,
    start,
    budget,
    decay: base.decay,
    themes: base.themes,
    rules,
    opening,
    weather: base.weather,
    fogSystems,
    commander: commanderName(rng)
  };
}

/** 🎲 RANDOM CHARACTER */
export function randomCharacter(rng = new RNG(freshSeed())) {
  return rng.pick(CHARACTERS).id;
}

/** 🎲 RANDOMIZE EVERYTHING: role, theme (Chaos included), starting city and conditions. */
export function randomRunConfig(seed = freshSeed()) {
  const rng = new RNG(`${seed}:random-run`);
  const character = rng.pick(CHARACTERS).id;
  const scenario = rng.chance(0.15) ? 'chaos' : rng.pick(PLAYABLE_THEMES);
  return createRunConfig({ character, scenario, seed, randomize: true });
}
