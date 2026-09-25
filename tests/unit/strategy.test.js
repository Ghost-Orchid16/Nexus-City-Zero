// GAMEPLAY STRATEGY ANALYSIS: styles must come from behavior, and explanations from real numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STYLES } from '../../src/sim/strategy-analysis.js';
import { makeSim, play } from './helpers.js';

const PERSONAS = {
  planner: 'planner',
  daredevil: 'risk',
  saver: 'optimizer',
  firefighter: 'responder',
  builder: 'infrastructure',
  caretaker: 'humanitarian',
  shifter: 'adaptive'
};

test('biased test commanders are recognized as their play style', () => {
  const scenarios = ['power', 'water', 'transport', 'supply', 'cyber'];
  for (const [persona, style] of Object.entries(PERSONAS)) {
    let hits = 0;
    for (const [k, scenario] of scenarios.entries()) {
      const sim = makeSim({ scenario, character: ['engineer', 'medical', 'logistics', 'ai', 'governor'][k], seed: `persona-${persona}-${k}` });
      play(sim, persona, { seed: k });
      if (sim.analysis.classify(sim).style === style) hits++;
    }
    assert.ok(hits >= 3, `${persona}: recognized ${hits}/5 times`);
  }
});

test('every play style has a name and an explanation built from measured numbers', () => {
  const sim = makeSim({ seed: 'reasons', scenario: 'weather' });
  play(sim, 'expert');
  const c = sim.analysis.classify(sim);
  assert.ok(STYLES[c.style] && c.name && c.blurb);
  assert.ok(c.reasons.length >= 2 && c.reasons.length <= 4);
  assert.ok(c.reasons.every((r) => /\d/.test(r) || r.includes('switched') || r.includes('moved')), c.reasons.join(' | '));
  assert.ok(c.metrics.decisions > 5 && c.metrics.avgDecisionTime > 0);
});

test('a run with no decisions is not labeled as if it had a strategy', () => {
  const sim = makeSim({ seed: 'idle' });
  play(sim, 'none');
  const c = sim.analysis.classify(sim);
  assert.equal(c.metrics.decisions, 0);
  assert.ok(Object.values(c.scores).every((v) => v === 0));
});
