/**
 * WHAT-IF analysis: replay one past decision with a different response.
 *
 * Both branches start from the exact snapshot taken when the decision was made (same city, same
 * RNG state), apply their response, and run for the same stretch of time with no new crises and
 * the adaptive engine frozen. Comparing the two isolates the consequence of the choice itself:
 * cascades, lingering effects and rule shocks all play out. The real run and its score are never
 * touched: branches run in separate sandbox simulations.
 */
import { SYSTEM_IDS } from '../data/resources.js';
import { Simulation } from './simulation.js';

export const WHAT_IF_HORIZON = 40; // simulated seconds after the decision

function branch(config, snapshot, choiceId, horizon) {
  const sim = new Simulation(config, { quiet: true }).restore(snapshot);
  sim.events.enabled = false;
  sim.adaptiveFrozen = true;
  const decision = choiceId ? sim.choose(choiceId, { decisionTime: 0 }) : sim.expire();
  if (!decision) return null;
  const start = sim.t;
  const curve = [{ in: 0, stability: sim.stability, levels: { ...sim.levels } }];
  let nextMark = 1;
  while (!sim.ended && sim.t < start + horizon - 1e-9) {
    sim.update(0.1);
    if (sim.t - start >= nextMark - 1e-9) {
      curve.push({ in: nextMark, stability: sim.stability, levels: { ...sim.levels } });
      nextMark++;
    }
  }
  return {
    decision,
    levels: { ...sim.levels },
    budget: sim.budget,
    stability: sim.stability,
    curve,
    cascades: sim.cascades.filter((c) => c.t > start).map((c) => c.from),
    failures: sim.criticalFailures - (snapshot.criticalFailures || 0),
    collapsed: sim.outcome === 'collapsed',
    seconds: Math.round(sim.t - start)
  };
}

/**
 * @param {object} config the run's config
 * @param {object} decision a decision record from sim.decisions (holds its snapshot)
 * @param {string|null} altChoiceId the alternative response (null = "no response")
 */
export function whatIf(config, decision, altChoiceId, horizon = WHAT_IF_HORIZON) {
  if (!decision?.snapshot) return null;
  const option = decision.options.find((o) => o.id === altChoiceId);
  if (altChoiceId && (!option || option.locked)) return null;
  const actual = branch(config, decision.snapshot, decision.choiceId, horizon);
  const alternative = branch(config, decision.snapshot, altChoiceId, horizon);
  if (!actual || !alternative) return null;
  const diff = {};
  for (const id of SYSTEM_IDS) diff[id] = Math.round(alternative.levels[id] - actual.levels[id]);
  diff.budget = Math.round(alternative.budget - actual.budget);
  const stabilityDiff = Math.round((alternative.stability - actual.stability) * 10) / 10;
  return {
    decisionIndex: decision.index,
    chosen: { id: decision.choiceId, label: decision.label },
    alternative: { id: altChoiceId, label: option ? option.label : 'No response' },
    actual,
    alt: alternative,
    diff,
    stabilityDiff,
    verdict: stabilityDiff > 2 ? 'better' : stabilityDiff < -2 ? 'worse' : 'similar',
    horizon: actual.seconds
  };
}
