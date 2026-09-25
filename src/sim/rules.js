/**
 * Scenario rules: the special mechanic of each crisis theme (and Chaos twists).
 *
 * A rule may:
 * - `periodic`: run a shock every N simulated seconds (returns a report, or null if it held off)
 * - `decay(sim, id, L)`: multiply a system's crisis decay (L = the levels being evaluated, so the
 *   same rule also drives the forward projections of the Predictive Model)
 * - `drain(sim, L)`: add a continuous drain in points per simulated second
 * - `fog(sim, L)`: hide some system readings while it returns true
 * - `hazard(sim)`: a persistent map hazard while the rule is active
 * - `eventRate`, `cascadeMult`, `budgetRegen`: plain multipliers read by the simulation
 * Rules only use the simulation's own RNG, so runs stay reproducible.
 */
const periodic = (every, fn) => ({ every, fn });

export const RULES = {
  brownouts: {
    periodic: periodic(45, (sim) => {
      if (sim.levels.energy > 70) return null;
      sim.applyDeltas({ energy: -8 });
      return { text: 'BROWNOUT: the grid sagged. Energy −8', district: 'energy', hazard: 'outage' };
    })
  },
  'storm-fronts': {
    periodic: periodic(40, (sim) => {
      const districts = ['water', 'residential', 'downtown', 'medical', 'energy', 'command', 'transport', 'industrial'];
      const d = sim.rng.pick(districts);
      const pairs = [['infrastructure', 'energy'], ['transport', 'infrastructure'], ['energy', 'communication'], ['water', 'infrastructure'], ['safety', 'transport']];
      const [a, b] = sim.rng.pick(pairs);
      sim.applyDeltas({ [a]: -6, [b]: -6 });
      return { text: `STORM FRONT hits the ${sim.districtName(d)}. ${sim.systemName(a)} −6, ${sim.systemName(b)} −6`, district: d, hazard: 'sparks' };
    })
  },
  drought: {
    decay: (sim, id, L) => (id === 'water' && L.water < 40 ? 1.5 : 1)
  },
  'data-fog': {
    fog: (sim, L) => L.communication < 50
  },
  'blind-spots': {
    fog: (sim, L) => L.communication < 50
  },
  'rush-waves': {
    periodic: periodic(50, (sim) => {
      if (sim.levels.transport > 65) return null;
      sim.applyDeltas({ transport: -8 });
      return { text: 'RUSH WAVE: traffic surged. Transport −8', district: 'transport', hazard: null };
    })
  },
  'patient-waves': {
    periodic: periodic(45, (sim) => {
      if (sim.levels.health > 70) return null;
      sim.applyDeltas({ health: -9 });
      return { text: 'PATIENT WAVE: new flu cases. Health −9', district: 'medical', hazard: null };
    })
  },
  'toxic-spread': {
    // until a choice with the `contain-toxic` flag is made, the cloud keeps spreading
    drain: (sim) => {
      if (sim.flags.has('contain-toxic')) return null;
      const growth = 0.04 + Math.min(0.08, sim.t / 2400);
      return { health: -growth, safety: -growth };
    },
    hazard: (sim) => (sim.flags.has('contain-toxic') ? null : { district: 'industrial', type: 'toxic' })
  },
  aftershocks: {
    periodic: periodic(50, (sim) => {
      if (sim.levels.infrastructure > 65) return null;
      const target = sim.rng.pick(['water', 'energy', 'transport', 'safety']);
      sim.applyDeltas({ [target]: -6 });
      return { text: `STRUCTURAL FAILURE: ${sim.systemName(target)} −6`, district: 'residential', hazard: 'crack' };
    })
  },
  shortages: {
    decay: (sim, id, L) => (id === 'supplies' && L.transport < 50 ? 1.5 : 1)
  },
  // ---- chaos twists (also used as secondary conditions by Randomize Everything)
  'double-trouble': { eventRate: 1.25 },
  'fragile-grid': { cascadeMult: { energy: 1.5 } },
  'rush-hour': { decay: (sim, id) => (id === 'transport' ? 1.5 : 1) },
  'tight-budget': { budgetRegen: 0.5 }
};

/** All active rule definitions for a run (scenario rules + twist). Unknown ids are ignored. */
export function activeRules(ruleIds) {
  return ruleIds.filter((id) => RULES[id]).map((id) => ({ id, ...RULES[id] }));
}
