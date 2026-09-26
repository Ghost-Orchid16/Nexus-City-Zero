#!/usr/bin/env node
/**
 * Monte Carlo balance report: plays thousands of headless runs with autopilot commanders across
 * every role × crisis theme (plus Chaos and Randomize Everything) and reports survival, collapse
 * rate, cascades, adaptive behavior and play-style spread. It also checks invariants on every
 * step, so it doubles as a "no impossible or broken states" test.
 *
 *   npm run balance                     # default: 4 seeds per combination
 *   npm run balance -- --runs 10 --strategies greedy,random --json report.json
 */
import { writeFileSync } from 'node:fs';
import { Simulation } from '../../src/sim/simulation.js';
import { createRunConfig, randomRunConfig } from '../../src/sim/run-setup.js';
import { Autopilot } from '../../src/sim/autopilot.js';
import { computeReport } from '../../src/sim/scoring.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { SCENARIOS } from '../../src/data/scenarios.js';
import { SYSTEM_IDS } from '../../src/data/resources.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1] ?? true]] : acc), [])
);
const RUNS = Number(args.runs || 4);
const STRATEGIES = String(args.strategies || 'none,random,greedy,expert').split(',');
const FRAME = 1 / 30;

function checkInvariants(sim, problems, label) {
  for (const id of SYSTEM_IDS) {
    const v = sim.levels[id];
    if (!Number.isFinite(v) || v < 0 || v > 100) problems.push(`${label}: ${id}=${v} at t=${sim.t}`);
  }
  if (!Number.isFinite(sim.budget) || sim.budget < -1e-6) problems.push(`${label}: budget=${sim.budget} at t=${sim.t}`);
  if (!Number.isFinite(sim.stability)) problems.push(`${label}: stability=${sim.stability}`);
  const ev = sim.activeEvent;
  if (ev && !ev.choices.some((c) => !c.locked)) problems.push(`${label}: crisis ${ev.id} has no available response`);
}

function play(config, strategy, seed, problems) {
  const sim = new Simulation(config);
  const pilot = new Autopilot(strategy, seed);
  const label = `${config.character}/${config.scenario}/${strategy}/${config.seed}`;
  let frames = 0;
  let messages = 0;
  sim.on('message', () => messages++);
  while (!sim.ended && frames < 60 * 60 * 12) {
    pilot.update(sim, FRAME);
    sim.update(FRAME);
    frames++;
    if (frames % 15 === 0) checkInvariants(sim, problems, label);
  }
  if (!sim.ended) problems.push(`${label}: run did not end`);
  const report = computeReport(sim);
  return { report, realSeconds: frames * FRAME, messages, sim };
}

const mean = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0);
const pct = (x) => `${Math.round(x * 100)}%`;
const pad = (s, n) => String(s).padEnd(n);
const num = (x, d = 0) => x.toFixed(d).padStart(5);

function summarize(rows) {
  return {
    n: rows.length,
    survival: mean(rows.map((r) => r.report.survival)),
    collapse: mean(rows.map((r) => (r.report.collapsed ? 1 : 0))),
    decisions: mean(rows.map((r) => r.report.decisionsMade + r.report.decisionsMissed)),
    cascades: mean(rows.map((r) => r.report.cascades)),
    failures: mean(rows.map((r) => r.report.criticalFailures)),
    spent: mean(rows.map((r) => r.report.budgetSpent)),
    intensity: mean(rows.map((r) => r.report.finalIntensity)),
    minutes: mean(rows.map((r) => r.realSeconds)) / 60,
    messages: mean(rows.map((r) => r.messages)),
    efficiency: mean(rows.map((r) => r.report.efficiency)),
    citizens: mean(rows.map((r) => r.report.citizensProtected))
  };
}

const problems = [];
const results = [];
const started = Date.now();
const themes = SCENARIOS.map((s) => s.id);
for (const strategy of STRATEGIES) {
  for (const scenario of themes) {
    for (const ch of CHARACTERS) {
      for (let k = 0; k < RUNS; k++) {
        const seed = `${scenario}-${ch.id}-${k}`;
        const config = createRunConfig({ character: ch.id, scenario, seed });
        results.push({ strategy, scenario, character: ch.id, kind: 'theme', ...play(config, strategy, k, problems) });
      }
    }
  }
  for (let k = 0; k < RUNS * 10; k++) {
    const config = randomRunConfig(`random-${k}`);
    results.push({ strategy, scenario: config.scenario, character: config.character, kind: 'random', ...play(config, strategy, k, problems) });
  }
}

console.log(`\nNEXUS balance report: ${results.length} runs in ${((Date.now() - started) / 1000).toFixed(1)} s\n`);
console.log(`${pad('strategy', 10)} runs  surv  coll  dec  casc  fail  spent  eff  cit  int  min  msgs`);
for (const strategy of STRATEGIES) {
  const s = summarize(results.filter((r) => r.strategy === strategy));
  console.log(`${pad(strategy, 10)} ${num(s.n)} ${num(s.survival)} ${pad(pct(s.collapse), 5)}${num(s.decisions, 1)}${num(s.cascades, 1)}${num(s.failures, 1)} ${num(s.spent)} ${num(s.efficiency)}${num(s.citizens)} ${s.intensity.toFixed(2)} ${s.minutes.toFixed(1)} ${num(s.messages, 1)}`);
}

for (const strategy of STRATEGIES.filter((s) => s !== 'none')) {
  console.log(`\n${strategy.toUpperCase()} by crisis theme (survival / collapse / cascades / intensity)`);
  for (const scenario of themes) {
    const s = summarize(results.filter((r) => r.strategy === strategy && r.scenario === scenario && r.kind === 'theme'));
    console.log(`  ${pad(scenario, 16)} ${num(s.survival)}  ${pad(pct(s.collapse), 5)} ${num(s.cascades, 1)}  ${s.intensity.toFixed(2)}`);
  }
  const rnd = summarize(results.filter((r) => r.strategy === strategy && r.kind === 'random'));
  console.log(`  ${pad('RANDOMIZED', 16)} ${num(rnd.survival)}  ${pad(pct(rnd.collapse), 5)} ${num(rnd.cascades, 1)}  ${rnd.intensity.toFixed(2)}`);
  console.log(`${strategy.toUpperCase()} by role`);
  for (const ch of CHARACTERS) {
    const s = summarize(results.filter((r) => r.strategy === strategy && r.character === ch.id && r.kind === 'theme'));
    console.log(`  ${pad(ch.id, 16)} ${num(s.survival)}  ${pad(pct(s.collapse), 5)} ${num(s.cascades, 1)}`);
  }
}

console.log('\nPlay styles detected');
for (const strategy of STRATEGIES) {
  const counts = {};
  for (const r of results.filter((x) => x.strategy === strategy)) counts[r.report.style.name] = (counts[r.report.style.name] || 0) + 1;
  console.log(`  ${pad(strategy, 10)} ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
}

const eventsSeen = new Set(results.flatMap((r) => r.sim.decisions.map((d) => d.eventId)));
console.log(`\nDistinct crises that appeared: ${eventsSeen.size}`);
console.log(problems.length ? `\nINVARIANT PROBLEMS (${problems.length}):\n${problems.slice(0, 20).join('\n')}` : '\nInvariants: OK (no out-of-range values, every crisis had a response, every run ended)');

if (args.json) {
  writeFileSync(String(args.json), JSON.stringify(results.map((r) => ({ strategy: r.strategy, scenario: r.scenario, character: r.character, kind: r.kind, survival: r.report.survival, collapsed: r.report.collapsed, style: r.report.style.style })), null, 1));
}
process.exitCode = problems.length ? 1 : 0;
