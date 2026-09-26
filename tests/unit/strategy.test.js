// GAMEPLAY STRATEGY ANALYSIS: styles must come from behavior, and explanations from real numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, NO_STYLE, MIN_DECISIONS } from '../../src/sim/strategy-analysis.js';
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
  assert.equal(c.style, null);
  assert.equal(c.name, NO_STYLE.name);
  assert.equal(c.runnerUp, null);
  // only facts about the run: no decision times or risk preferences that were never measured
  assert.match(c.reasons[0], new RegExp(`^You answered 0 of ${c.metrics.ignored} crises`));
  assert.ok(c.reasons.every((r) => !/decision time|risk/i.test(r)), c.reasons.join(' | '));
});

test(`fewer than ${MIN_DECISIONS} answered crises is too little evidence for a play style`, () => {
  const sim = makeSim({ seed: 'sparse' });
  sim.update(0.1);
  let answered = 0;
  for (let i = 0; i < 20000 && !sim.ended; i++) {
    const ev = sim.activeEvent;
    if (ev && answered < MIN_DECISIONS - 1) {
      const open = ev.choices.find((ch) => !ch.locked);
      if (open && sim.choose(open.id, { decisionTime: 4 })) answered++;
    }
    sim.update(0.1);
  }
  assert.equal(sim.analysis.classify(sim).style, null);
  assert.equal(sim.decisions.filter((d) => !d.ignored).length, MIN_DECISIONS - 1);
});
