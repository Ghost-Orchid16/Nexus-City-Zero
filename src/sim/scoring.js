/**
 * Final city report. Every number is computed from the recorded run (history samples, decision
 * records, cascades, budget ledger), so nothing on the results screen is decorative.
 */
import { SYSTEM_IDS } from '../data/resources.js';
import { SESSION_LENGTH } from './clock.js';

/** Fictional population of NEXUS, used to turn the protected share into a head count. */
export const POPULATION = 480000;

export const OUTCOMES = [
  { id: 'collapsed', min: -1, title: 'CITY COLLAPSED', text: 'The city fell before the countdown ended.', color: 'red' },
  { id: 'secured', min: 80, title: 'CITY SECURED', text: 'NEXUS came through the crisis strong.', color: 'green' },
  { id: 'stabilized', min: 60, title: 'CITY STABILIZED', text: 'The city held together, with scars.', color: 'teal' },
  { id: 'damaged', min: 40, title: 'CITY DAMAGED', text: 'NEXUS survived, but many systems are broken.', color: 'orange' },
  { id: 'barely', min: 0, title: 'BARELY STANDING', text: 'The city survived the countdown, just.', color: 'coral' }
];

const mean = (list) => (list.length ? list.reduce((s, x) => s + x, 0) / list.length : 0);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** How well the people-facing systems are doing (0–100). */
export function peopleIndex(levels) {
  return 0.45 * levels.health + 0.35 * levels.safety + 0.2 * levels.supplies;
}

/** Survival blends where the city ended with how it fared along the way, minus failures. */
export function survivalScore({ finalStability, avgStability, criticalFailures, collapsed, endedAt }) {
  let v = 0.6 * finalStability + 0.4 * avgStability - Math.min(18, criticalFailures * 3);
  if (collapsed) v = Math.min(v, 25) * clamp(endedAt / SESSION_LENGTH, 0, 1);
  return clamp(Math.round(v), 0, 100);
}

/** Survival achieved relative to budget spent (spending 150 halves it). */
export function efficiencyScore(survival, spent) {
  return clamp(Math.round(survival * (1 - spent / (spent + 150))), 0, 100);
}

export function outcomeFor(collapsed, survival) {
  if (collapsed) return OUTCOMES[0];
  return OUTCOMES.slice(1).find((o) => survival >= o.min);
}

export function computeReport(sim) {
  const series = sim.series;
  const collapsed = sim.outcome === 'collapsed';
  const finalStability = Math.round(sim.stability);
  const avgStability = Math.round(mean(series.map((s) => s.stability)));
  const survival = survivalScore({ finalStability: sim.stability, avgStability: mean(series.map((s) => s.stability)), criticalFailures: sim.criticalFailures, collapsed, endedAt: sim.endedAt ?? sim.t });
  const systems = Object.fromEntries(SYSTEM_IDS.map((id) => [id, Math.round(sim.levels[id])]));
  const protectedShare = mean(series.map((s) => Math.min(1, peopleIndex(s.levels) / 80)));
  const citizensProtected = Math.round(protectedShare * 100);
  const decisions = sim.decisions;
  const answered = decisions.filter((d) => !d.ignored);
  const style = sim.analysis.classify(sim);
  const impact = (d) => (d.stabilityLater ?? d.stabilityAfter) - d.stabilityBefore;
  const ranked = [...answered].sort((a, b) => impact(b) - impact(a));
  const categories = new Set(answered.filter((d) => d.kind !== 'recovery').map((d) => d.category));
  const outcome = outcomeFor(collapsed, survival);
  return {
    outcome: outcome.id,
    outcomeTitle: outcome.title,
    outcomeText: outcome.text,
    outcomeColor: outcome.color,
    completed: !collapsed,
    collapsed,
    survival,
    finalStability,
    avgStability,
    minStability: Math.round(sim.minStability),
    peakStability: Math.round(sim.peakStability),
    systems,
    minLevels: Object.fromEntries(SYSTEM_IDS.map((id) => [id, Math.round(sim.minLevels[id])])),
    citizensProtected,
    citizensCount: Math.round((POPULATION * protectedShare) / 100) * 100,
    population: POPULATION,
    resourcesRemaining: Math.round((100 * sim.budget) / Math.max(1, sim.budgetEarned)),
    budgetFinal: Math.round(sim.budget),
    budgetStart: Math.round(sim.budgetStart),
    budgetEarned: Math.round(sim.budgetEarned),
    budgetSpent: Math.round(sim.budgetSpent),
    efficiency: efficiencyScore(survival, sim.budgetSpent),
    decisionsMade: answered.length,
    decisionsMissed: decisions.length - answered.length,
    avgDecisionTime: answered.length ? Math.round(mean(answered.map((d) => d.decisionTime)) * 10) / 10 : 0,
    cascades: sim.cascades.length,
    cascadeFrom: sim.cascades.map((c) => c.from),
    cascadesAnswered: sim.cascades.filter((c) => c.answered).length,
    blockedCascades: sim.blocked.map((b) => b.system),
    criticalFailures: sim.criticalFailures,
    abilityUses: sim.ability.uses,
    abilityId: sim.ability.id,
    categoriesAnswered: categories.size,
    adaptiveChanges: sim.adaptive.changes.length,
    finalIntensity: sim.adaptive.intensity,
    style,
    bestDecision: ranked[0] && impact(ranked[0]) > 0 ? ranked[0].index : null,
    worstDecision: ranked.length > 1 && impact(ranked.at(-1)) < 0 ? ranked.at(-1).index : null,
    character: sim.config.character,
    scenario: sim.config.scenario,
    scenarioIds: sim.config.scenarioIds,
    chaos: !!sim.config.chaos,
    randomized: !!sim.config.randomized,
    twist: sim.config.twist,
    seed: sim.config.seed,
    commander: sim.config.commander,
    duration: Math.round(sim.endedAt ?? sim.t)
  };
}
