import { Simulation } from '../../src/sim/simulation.js';
import { createRunConfig } from '../../src/sim/run-setup.js';
import { Autopilot } from '../../src/sim/autopilot.js';

export function makeSim(opts = {}) {
  const { character = 'engineer', scenario = 'power', seed = 'test-seed', randomize = false, mutate } = opts;
  const config = createRunConfig({ character, scenario, seed, randomize });
  if (mutate) mutate(config);
  return new Simulation(config);
}

/** Play until the end (or `until` sim seconds) with an autopilot; returns real seconds elapsed. */
export function play(sim, strategy = 'greedy', { frame = 1 / 20, until = Infinity, seed = 1 } = {}) {
  const pilot = new Autopilot(strategy, seed);
  let real = 0;
  while (!sim.ended && sim.t < until && real < 3600) {
    pilot.update(sim, frame);
    sim.update(frame);
    real += frame;
  }
  return real;
}

/** Advance real time without making decisions. */
export function wait(sim, seconds, frame = 1 / 20) {
  for (let s = 0; s < seconds && !sim.ended; s += frame) sim.update(frame);
}

/** Run until a crisis card is open. */
export function untilEvent(sim, maxSeconds = 120) {
  for (let s = 0; s < maxSeconds && !sim.activeEvent && !sim.ended; s += 0.05) sim.update(0.05);
  return sim.activeEvent;
}

/** A stable fingerprint of a run for determinism checks (snapshots excluded). */
export function fingerprint(sim) {
  return JSON.stringify({
    levels: sim.levels,
    budget: sim.budget,
    t: sim.t,
    outcome: sim.outcome,
    decisions: sim.decisions.map(({ snapshot, ...d }) => d),
    cascades: sim.cascades,
    series: sim.series,
    messages: sim.messages
  });
}
