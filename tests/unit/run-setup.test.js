// Run setup: role × theme configs, Randomize Everything and Chaos Mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunConfig, randomRunConfig, randomCharacter, RANDOM_RANGES } from '../../src/sim/run-setup.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { SCENARIOS, SCENARIO_BY_ID, DEFAULT_BUDGET, CHAOS_TWISTS } from '../../src/data/scenarios.js';
import { SYSTEM_IDS } from '../../src/data/resources.js';
import { RULES } from '../../src/sim/rules.js';
import { EVENT_BY_ID } from '../../src/data/events/index.js';
import { RNG } from '../../src/core/rng.js';

test('every role × theme builds a valid configuration', () => {
  for (const ch of CHARACTERS) {
    for (const s of SCENARIOS) {
      const c = createRunConfig({ character: ch.id, scenario: s.id, seed: 'setup' });
      for (const id of SYSTEM_IDS) assert.ok(c.start[id] >= 30 && c.start[id] <= 90, `${s.id} ${id}`);
      assert.ok(c.budget >= 20);
      for (const r of c.rules) assert.ok(RULES[r], r);
      if (c.opening) assert.ok(EVENT_BY_ID[c.opening]);
      assert.match(c.commander, /^CMDR\. [A-Z]+ [A-Z]+$/);
    }
  }
});

test('themes change the city: each theme starts its own systems in trouble', () => {
  for (const s of SCENARIOS.filter((x) => !x.chaos)) {
    const c = createRunConfig({ character: 'engineer', scenario: s.id, seed: 'theme' });
    for (const [id, v] of Object.entries(s.start)) assert.equal(c.start[id], v);
    assert.deepEqual(c.rules, [s.rule.id]);
    assert.equal(c.opening, s.opening);
  }
  const gov = createRunConfig({ character: 'governor', scenario: 'power', seed: 'b' });
  assert.equal(gov.budget, DEFAULT_BUDGET + 25);
});

test('the same seed always builds the same run', () => {
  assert.deepEqual(randomRunConfig('same'), randomRunConfig('same'));
  assert.deepEqual(createRunConfig({ character: 'ai', scenario: 'chaos', seed: 9 }), createRunConfig({ character: 'ai', scenario: 'chaos', seed: 9 }));
});

test('Randomize Everything varies role, theme, start, budget, opening and adds a secondary condition, within balanced ranges', () => {
  const roles = new Set();
  const themes = new Set();
  const openings = new Set();
  const budgets = new Set();
  for (let k = 0; k < 60; k++) {
    const c = randomRunConfig(`rr-${k}`);
    roles.add(c.character);
    themes.add(c.scenario);
    openings.add(c.opening);
    budgets.add(c.budget);
    assert.ok(c.randomized && c.twist && CHAOS_TWISTS.some((t) => t.id === c.twist));
    for (const id of SYSTEM_IDS) assert.ok(c.start[id] >= RANDOM_RANGES.crisis.min && c.start[id] <= RANDOM_RANGES.normal.max, `${id}=${c.start[id]}`);
  }
  assert.ok(roles.size >= 6 && themes.size >= 8 && openings.size >= 10 && budgets.size >= 10);
});

test('Chaos Mode blends two themes with a surprise twist', () => {
  const pairs = new Set();
  for (let k = 0; k < 20; k++) {
    const c = createRunConfig({ character: 'scientist', scenario: 'chaos', seed: `chaos-${k}` });
    assert.equal(c.scenarioIds.length, 2);
    assert.notEqual(c.scenarioIds[0], c.scenarioIds[1]);
    for (const id of c.scenarioIds) assert.ok(c.rules.includes(SCENARIO_BY_ID[id].rule.id));
    assert.ok(c.twist && c.rules.includes(c.twist) || c.rules.length >= 2);
    assert.ok(c.chaos);
    pairs.add(c.scenarioIds.slice().sort().join('+'));
  }
  assert.ok(pairs.size >= 8, `${pairs.size} distinct theme pairs`);
});

test('Random Character picks every role over time', () => {
  const rng = new RNG('dice');
  const seen = new Set();
  for (let k = 0; k < 80; k++) seen.add(randomCharacter(rng));
  assert.equal(seen.size, 7);
});
