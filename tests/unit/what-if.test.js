// WHAT-IF: alternative outcomes are simulated in a sandbox and never touch the real run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { whatIf } from '../../src/sim/what-if.js';
import { computeReport } from '../../src/sim/scoring.js';
import { SYSTEM_IDS } from '../../src/data/resources.js';
import { makeSim, play, fingerprint } from './helpers.js';

function finishedRun(seed = 'whatif-1') {
  const sim = makeSim({ seed, scenario: 'hospital', character: 'medical' });
  play(sim, 'expert');
  return sim;
}

test('replaying the same choice gives zero difference', () => {
  const sim = finishedRun();
  const d = sim.decisions.find((x) => !x.ignored);
  const r = whatIf(sim.config, d, d.choiceId);
  assert.ok(r);
  for (const id of SYSTEM_IDS) assert.equal(r.diff[id], 0, id);
  assert.equal(r.stabilityDiff, 0);
  assert.equal(r.verdict, 'similar');
});

test('an alternative response produces a real, reproducible difference', () => {
  const sim = finishedRun();
  let found = null;
  for (const d of sim.decisions.filter((x) => !x.ignored)) {
    const alt = d.options.find((o) => o.id !== d.choiceId && !o.locked);
    if (!alt) continue;
    const r = whatIf(sim.config, d, alt.id);
    if (SYSTEM_IDS.some((id) => r.diff[id] !== 0)) {
      found = { d, alt, r };
      break;
    }
  }
  assert.ok(found, 'some alternative changed the outcome');
  const again = whatIf(sim.config, found.d, found.alt.id);
  assert.deepEqual(again.diff, found.r.diff);
  assert.equal(found.r.alternative.label, found.alt.label);
  assert.ok(found.r.horizon > 0 && found.r.actual.curve.length > 1);
});

test('What-If never alters the original run or its score', () => {
  const sim = finishedRun('whatif-2');
  const before = fingerprint(sim);
  const scoreBefore = JSON.stringify(computeReport(sim));
  for (const d of sim.decisions) {
    for (const o of d.options) if (!o.locked) whatIf(sim.config, d, o.id);
    whatIf(sim.config, d, null);
  }
  assert.equal(fingerprint(sim), before);
  assert.equal(JSON.stringify(computeReport(sim)), scoreBefore);
});

test('responses that were unaffordable at the time are not offered as alternatives', () => {
  const sim = makeSim({ seed: 'whatif-broke', mutate: (c) => { c.budget = 0; } });
  play(sim, 'greedy');
  const d = sim.decisions.find((x) => x.options.some((o) => o.locked));
  if (!d) return; // every card happened to be affordable
  const locked = d.options.find((o) => o.locked);
  assert.equal(whatIf(sim.config, d, locked.id), null);
});
