// Core simulation: determinism, invariants, crises, cascades, abilities, time and adaptation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, SIM, PHASES, DEPENDENTS } from '../../src/sim/simulation.js';
import { SESSION_LENGTH, clockAt } from '../../src/sim/clock.js';
import { createRunConfig, randomRunConfig } from '../../src/sim/run-setup.js';
import { SYSTEM_IDS, THRESHOLDS } from '../../src/data/resources.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { SCENARIOS } from '../../src/data/scenarios.js';
import { PREFIX } from '../../src/sim/analyst.js';
import { makeSim, play, wait, untilEvent, fingerprint } from './helpers.js';

test('determinism: the same seed and the same decisions replay identically', () => {
  const a = makeSim({ seed: 'replay-7', scenario: 'weather', character: 'logistics' });
  const b = makeSim({ seed: 'replay-7', scenario: 'weather', character: 'logistics' });
  play(a, 'expert', { seed: 3 });
  play(b, 'expert', { seed: 3 });
  assert.equal(fingerprint(a), fingerprint(b));
});

test('different seeds produce different crisis orders', () => {
  const orders = new Set();
  for (let k = 0; k < 6; k++) {
    const sim = makeSim({ seed: `order-${k}`, scenario: 'supply' });
    play(sim, 'greedy');
    orders.add(sim.decisions.map((d) => d.eventId).join(','));
  }
  assert.ok(orders.size >= 5, `only ${orders.size} distinct orders`);
});

test('no impossible or broken states across hundreds of simulated runs', () => {
  const strategies = ['none', 'random', 'greedy', 'expert', 'daredevil', 'saver'];
  let runs = 0;
  for (const scenario of SCENARIOS.map((s) => s.id)) {
    for (const [i, ch] of CHARACTERS.entries()) {
      const strategy = strategies[(i + runs) % strategies.length];
      const sim = makeSim({ scenario, character: ch.id, seed: `inv-${scenario}-${ch.id}` });
      const check = () => {
        for (const id of SYSTEM_IDS) assert.ok(sim.levels[id] >= 0 && sim.levels[id] <= 100, `${id} out of range`);
        assert.ok(sim.budget >= 0 && Number.isFinite(sim.budget), 'budget');
        assert.ok(sim.stability >= 0 && sim.stability <= 100, 'stability');
        if (sim.activeEvent) assert.ok(sim.activeEvent.choices.some((c) => !c.locked), 'a crisis without any available response');
      };
      sim.on('event', check);
      sim.on('resolved', check);
      play(sim, strategy);
      check();
      assert.ok(sim.ended, 'run ended');
      assert.ok(sim.t <= SESSION_LENGTH + 1e-6);
      runs++;
    }
  }
  for (let k = 0; k < 30; k++) {
    const sim = new Simulation(randomRunConfig(`inv-random-${k}`));
    play(sim, k % 2 ? 'random' : 'expert');
    assert.ok(sim.ended);
  }
});

test('a session takes about 3–5 minutes of real play', () => {
  for (const strategy of ['greedy', 'random']) {
    const sim = makeSim({ seed: `len-${strategy}` });
    const real = play(sim, strategy);
    assert.equal(sim.outcome, 'survived');
    assert.ok(real >= 180 && real <= 300, `${strategy}: ${real.toFixed(0)} s`);
  }
});

test('crisis cards: impact on arrival, 2–4 responses, exact preview numbers applied', () => {
  const sim = makeSim({ seed: 'card-1' });
  const ev = untilEvent(sim);
  assert.ok(ev, 'a crisis arrived');
  assert.ok(ev.choices.length >= 2 && ev.choices.length <= 4);
  const c = ev.choices.find((x) => !x.locked);
  const before = { ...sim.levels };
  const budget = sim.budget;
  const d = sim.choose(c.id);
  assert.equal(d.choiceId, c.id);
  assert.equal(sim.activeEvent, null);
  assert.ok(Math.abs(sim.budget - (budget - c.cost + (c.effects.budget || 0))) < 1e-9);
  for (const [k, v] of Object.entries(c.effects)) if (k !== 'budget') assert.ok(Math.abs(sim.levels[k] - Math.max(0, Math.min(100, before[k] + v))) < 1e-9, k);
});

test('locked responses cannot be chosen, and a broke commander still gets an underfunded option', () => {
  const sim = makeSim({ seed: 'broke', mutate: (c) => { c.budget = 0; } });
  const ev = untilEvent(sim);
  const locked = ev.choices.find((c) => c.locked);
  if (locked) assert.equal(sim.choose(locked.id), null);
  assert.ok(ev.choices.some((c) => !c.locked), 'at least one response is available');
  const paid = ev.choices.filter((c) => !c.locked);
  if (paid.every((c) => c.cost > 0)) assert.ok(paid.some((c) => c.underfunded));
});

test('ignoring a crisis applies its consequences when the timer runs out', () => {
  const sim = makeSim({ seed: 'ignore-1' });
  const ev = untilEvent(sim);
  const before = { ...sim.levels };
  const window = ev.window;
  wait(sim, window + 0.5);
  const d = sim.decisions[0];
  assert.ok(d.ignored);
  assert.deepEqual(d.effects, ev.ignore);
  for (const [k, v] of Object.entries(ev.ignore)) assert.ok(sim.levels[k] < before[k] + v / 2, `${k} dropped`);
});

test('time slows to 30% while a card is open; the response timer runs on real time', () => {
  const sim = makeSim({ seed: 'dilate' });
  untilEvent(sim);
  const t0 = sim.t;
  const remaining = sim.activeEvent.remaining;
  wait(sim, 2);
  assert.ok(Math.abs(sim.t - t0 - 0.6) < 0.15, `sim advanced ${sim.t - t0}`);
  assert.ok(Math.abs(remaining - sim.activeEvent.remaining - 2) < 0.1);
});

test('cascades: a system falling into the critical zone spreads and raises its cascade crisis', () => {
  const sim = makeSim({ seed: 'cascade-1', scenario: 'water', character: 'governor' });
  let cascade = null;
  sim.on('cascade', (c) => { cascade = c; });
  sim.levels.energy = THRESHOLDS.critical + 0.5;
  sim.config.decay.energy = 0.5;
  for (let i = 0; i < 400 && !cascade; i++) {
    if (sim.activeEvent) sim.choose(sim.activeEvent.choices.find((c) => !c.locked).id);
    sim.update(0.05);
  }
  assert.ok(cascade, 'cascade recorded');
  assert.equal(cascade.from, 'energy');
  assert.deepEqual(cascade.to, DEPENDENTS.energy);
  const raised = sim.events.queue.some((q) => q.id === 'cascade-energy') || sim.activeEvent?.id === 'cascade-energy';
  assert.ok(cascade.raised && raised, 'cascade crisis queued or already on screen');
  const rates = sim.computeRates();
  const healthy = sim.computeRates({ ...sim.levels, energy: 80 });
  assert.ok(rates.water < healthy.water && rates.communication < healthy.communication, 'dependents drain faster');
});

test('Grid Stabilization blocks an energy cascade', () => {
  const sim = makeSim({ seed: 'shield-1', character: 'energy' });
  sim.update(0.05);
  assert.ok(sim.useAbility(), 'ability used');
  let cascades = 0;
  sim.on('cascade', () => cascades++);
  sim.levels.energy = 20;
  wait(sim, 1);
  assert.equal(cascades, 0);
  assert.ok(sim.blocked.some((b) => b.system === 'energy'));
});

test('abilities: every role changes the city, with charges and cooldowns enforced', () => {
  for (const ch of CHARACTERS) {
    const sim = makeSim({ seed: `ability-${ch.id}`, character: ch.id });
    sim.levels.infrastructure = 40;
    sim.levels.health = 40;
    wait(sim, 0.2);
    const before = JSON.stringify([sim.levels, sim.buffs, sim.shields, sim.predictUntil, sim.events.forecast]);
    const report = sim.useAbility();
    assert.ok(report && report.text, `${ch.id}: report`);
    assert.notEqual(JSON.stringify([sim.levels, sim.buffs, sim.shields, sim.predictUntil, sim.events.forecast]), before, `${ch.id}: no effect`);
    assert.equal(sim.ability.charges, ch.ability.charges - 1);
    if (sim.ability.charges > 0) assert.equal(sim.canUseAbility(), ch.ability.cooldown === 0, `${ch.id}: cooldown`);
    else assert.equal(sim.useAbility(), null, `${ch.id}: out of charges`);
  }
});

test('the Governor reactor comes with its trade-offs', () => {
  const sim = makeSim({ seed: 'reactor', character: 'governor' });
  wait(sim, 0.2);
  const before = { ...sim.levels, budget: sim.budget };
  sim.useAbility();
  assert.ok(sim.reactorActive);
  assert.ok(sim.levels.energy > before.energy + 35);
  assert.ok(sim.levels.safety < before.safety);
  assert.ok(sim.budget <= before.budget - 29.9);
  assert.ok(sim.lingering.some((l) => l.system === 'water' && l.rate < 0));
});

test('roles change the numbers on the cards', () => {
  const card = (character) => {
    const sim = makeSim({ seed: 'roles-card', scenario: 'infrastructure', character });
    return untilEvent(sim);
  };
  const eng = card('engineer');
  const sci = card('scientist');
  assert.equal(eng.id, sci.id);
  const gain = (ev, sys) => Math.max(...ev.choices.map((c) => c.effects[sys] || 0));
  assert.ok(gain(eng, 'infrastructure') > gain(sci, 'infrastructure'), 'engineer builds more than the scientist');
});

test('final-minute warnings fire at 60, 30 and 10 seconds on the clock', () => {
  const sim = makeSim({ seed: 'phases' });
  const seen = [];
  sim.on('phase', (p) => seen.push([p.title, Math.round(clockAt(sim.t))]));
  play(sim, 'greedy');
  assert.deepEqual(seen, [['CRITICAL WINDOW', 60], ['SYSTEM CASCADE IMMINENT', 30], ['CITY STABILITY CRITICAL', 10]]);
  assert.deepEqual(PHASES.map((p) => p.id), ['critical-window', 'cascade-imminent', 'stability-critical']);
});

test('a city without a commander collapses; the countdown ends a managed run', () => {
  let collapsed = 0;
  for (let k = 0; k < 6; k++) {
    const sim = makeSim({ seed: `collapse-${k}`, scenario: ['power', 'hospital', 'weather'][k % 3] });
    play(sim, 'none');
    if (sim.outcome === 'collapsed') collapsed++;
  }
  assert.ok(collapsed >= 3, `only ${collapsed}/6 collapsed`);
  const managed = makeSim({ seed: 'managed' });
  play(managed, 'expert');
  assert.equal(managed.outcome, 'survived');
  assert.ok(Math.abs(managed.t - SESSION_LENGTH) < 0.11);
});

test('stability rewards balance: one weak link costs more than a strong system gains', () => {
  const sim = makeSim();
  const even = Object.fromEntries(SYSTEM_IDS.map((id) => [id, 60]));
  const uneven = { ...even, energy: 30, water: 90 };
  assert.ok(sim.computeStability(even, 50) > sim.computeStability(uneven, 50));
  assert.equal(Math.round(sim.computeStability(Object.fromEntries(SYSTEM_IDS.map((id) => [id, 100])), 100)), 100);
});

test('adaptive difficulty escalates for strong play and relieves a struggling city', () => {
  const strong = makeSim({ seed: 'adapt-strong', scenario: 'supply', mutate: (c) => { for (const id of SYSTEM_IDS) c.start[id] = 95; c.budget = 120; } });
  play(strong, 'expert', { until: 110 });
  assert.ok(strong.adaptive.intensity > 1, `strong intensity ${strong.adaptive.intensity}`);
  const weak = makeSim({ seed: 'adapt-weak', scenario: 'hospital', mutate: (c) => { for (const id of SYSTEM_IDS) c.start[id] = 38; } });
  play(weak, 'none', { until: 90 });
  assert.ok(weak.adaptive.intensity < 1, `weak intensity ${weak.adaptive.intensity}`);
  assert.ok(weak.adaptive.changes.every((c) => c.action === 'relieve'));
});

test('command-AI messages are grounded, labeled and rate-limited', () => {
  const sim = makeSim({ seed: 'msgs', scenario: 'cyber' });
  play(sim, 'random');
  const routine = sim.messages.filter((m) => !m.urgent);
  for (const m of sim.messages) assert.ok(Object.values(PREFIX).includes(m.prefix) && m.text.length > 8);
  for (let i = 1; i < routine.length; i++) assert.ok(routine[i].t - routine[i - 1].t >= 12 - 1e-6, 'routine messages too close');
  assert.ok(sim.messages.length <= 22, `${sim.messages.length} messages`);
  assert.equal(new Set(sim.messages.map((m) => m.text)).size >= sim.messages.length - 2, true, 'repetitive messages');
});

test('data fog hides readings in a cyber emergency, but not from the AI Systems Architect', () => {
  const fogged = makeSim({ scenario: 'cyber', character: 'engineer', mutate: (c) => { c.start.communication = 40; } });
  assert.ok(fogged.fogSystems.length === 3 && fogged.fogActive());
  assert.ok(fogged.fogSystems.every((id) => fogged.isFogged(id)));
  const ai = makeSim({ scenario: 'cyber', character: 'ai', mutate: (c) => { c.start.communication = 40; } });
  assert.equal(ai.fogActive(), false);
});

test('projections are pure and predict decline', () => {
  const sim = makeSim({ scenario: 'water', seed: 'proj' });
  const before = fingerprint(sim);
  const p = sim.project(60);
  assert.equal(fingerprint(sim), before, 'projection mutated the simulation');
  assert.ok(p.levels.water < sim.levels.water);
});

test('scenario rules act: brownouts hit the grid in a power crisis', () => {
  const sim = makeSim({ scenario: 'power', seed: 'rules' });
  const rules = [];
  sim.on('rule', (r) => rules.push(r));
  play(sim, 'none', { until: 100 });
  assert.ok(rules.some((r) => r.rule === 'brownouts'));
  assert.ok(SIM.step > 0);
});
