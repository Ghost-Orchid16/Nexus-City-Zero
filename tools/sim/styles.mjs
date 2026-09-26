#!/usr/bin/env node
/**
 * Play-style calibration: plays runs with deliberately biased autopilot personas and prints how
 * the GAMEPLAY STRATEGY ANALYSIS classifies them. Each persona should mostly receive its own
 * style; this proves the classification is driven by behavior, not by the crises faced.
 *
 *   node tools/sim/styles.mjs [--runs 3]
 */
import { Simulation } from '../../src/sim/simulation.js';
import { createRunConfig } from '../../src/sim/run-setup.js';
import { Autopilot } from '../../src/sim/autopilot.js';
import { SCENARIOS } from '../../src/data/scenarios.js';
import { CHARACTERS } from '../../src/data/characters.js';

export const PERSONAS = {
  planner: 'planner',
  daredevil: 'risk',
  saver: 'optimizer',
  firefighter: 'responder',
  builder: 'infrastructure',
  caretaker: 'humanitarian',
  shifter: 'adaptive'
};

export function classifyPersona(persona, runs = 3) {
  const counts = {};
  const scenarios = SCENARIOS.map((s) => s.id);
  let total = 0;
  for (let k = 0; k < runs; k++) {
    for (const scenario of scenarios) {
      const character = CHARACTERS[(k + scenarios.indexOf(scenario)) % CHARACTERS.length].id;
      const sim = new Simulation(createRunConfig({ character, scenario, seed: `style-${persona}-${scenario}-${k}` }));
      const pilot = new Autopilot(persona, k);
      while (!sim.ended) {
        pilot.update(sim, 1 / 20);
        sim.update(1 / 20);
      }
      const style = sim.analysis.classify(sim).style;
      counts[style] = (counts[style] || 0) + 1;
      total++;
    }
  }
  return { counts, total, hit: (counts[PERSONAS[persona]] || 0) / total };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[process.argv.indexOf('--runs') + 1]) || 3;
  for (const persona of Object.keys(PERSONAS)) {
    const { counts, hit } = classifyPersona(persona, runs);
    const spread = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s, c]) => `${s} ${c}`).join(' · ');
    console.log(`${persona.padEnd(12)} → expected ${PERSONAS[persona].padEnd(15)} hit ${String(Math.round(hit * 100)).padStart(3)}%   ${spread}`);
  }
}
