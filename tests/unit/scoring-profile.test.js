// Final report, achievements, scoreboard and the versioned local save.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeReport, survivalScore, efficiencyScore, outcomeFor } from '../../src/sim/scoring.js';
import { defaultProfile, recordRun, sanitizeProfile, BOARDS, BOARD_SIZE, renameRun, resetScoreboard } from '../../src/core/profile.js';
import { ProfileStore, STORAGE_KEY, BACKUP_KEY } from '../../src/core/storage.js';
import { ACHIEVEMENT_BY_ID } from '../../src/data/achievements.js';
import { SYSTEM_IDS } from '../../src/data/resources.js';
import { makeSim, play } from './helpers.js';

class FakeStorage {
  constructor() {
    this.data = {};
  }

  getItem(k) {
    return k in this.data ? this.data[k] : null;
  }

  setItem(k, v) {
    this.data[k] = String(v);
  }

  removeItem(k) {
    delete this.data[k];
  }
}

test('survival and efficiency stay in range; a collapse caps the score', () => {
  assert.equal(survivalScore({ finalStability: 100, avgStability: 100, criticalFailures: 0, collapsed: false, endedAt: 180 }), 100);
  assert.equal(survivalScore({ finalStability: 0, avgStability: 0, criticalFailures: 9, collapsed: false, endedAt: 180 }), 0);
  assert.ok(survivalScore({ finalStability: 90, avgStability: 90, criticalFailures: 0, collapsed: true, endedAt: 90 }) <= 13);
  assert.equal(efficiencyScore(80, 0), 80);
  assert.ok(efficiencyScore(80, 150) === 40);
  assert.equal(outcomeFor(true, 90).id, 'collapsed');
  assert.equal(outcomeFor(false, 90).id, 'secured');
  assert.equal(outcomeFor(false, 10).id, 'barely');
});

test('the city report is computed from the run, not invented', () => {
  const sim = makeSim({ seed: 'report', scenario: 'transport', character: 'logistics' });
  play(sim, 'expert');
  const r = computeReport(sim);
  assert.equal(r.completed, true);
  for (const id of SYSTEM_IDS) assert.equal(r.systems[id], Math.round(sim.levels[id]));
  assert.equal(r.decisionsMade + r.decisionsMissed, sim.decisions.length);
  assert.equal(r.cascades, sim.cascades.length);
  assert.equal(r.budgetFinal, Math.round(sim.budget));
  assert.ok(r.survival >= 0 && r.survival <= 100);
  assert.ok(r.citizensProtected >= 0 && r.citizensProtected <= 100);
  assert.ok(r.citizensCount <= r.population);
  assert.ok(r.style.name && r.style.reasons.length);
});

test('recording runs fills sorted, capped scoreboards and unlocks achievements once', () => {
  const profile = defaultProfile();
  const reports = [];
  for (let k = 0; k < 8; k++) {
    const sim = makeSim({ seed: `board-${k}`, scenario: k % 2 ? 'chaos' : 'water', character: ['governor', 'ai'][k % 2] });
    play(sim, k % 3 ? 'expert' : 'random');
    reports.push(computeReport(sim));
  }
  const unlockedAll = [];
  for (const [k, r] of reports.entries()) {
    const { unlocked } = recordRun(profile, r, { date: `2026-01-0${k + 1}T00:00:00Z` });
    unlockedAll.push(...unlocked);
  }
  assert.equal(new Set(unlockedAll).size, unlockedAll.length, 'an achievement unlocked twice');
  for (const b of BOARDS) {
    const list = profile.boards[b.id];
    assert.ok(list.length <= BOARD_SIZE);
    for (let i = 1; i < list.length; i++) {
      if (b.better === 'high') assert.ok(list[i - 1].value >= list[i].value);
      else assert.ok(list[i - 1].value <= list[i].value);
    }
  }
  assert.equal(profile.boards.survival.length, Math.min(BOARD_SIZE, reports.length));
  assert.equal(profile.stats.runs, 8);
  assert.ok(profile.boards.chaos.every((e) => e.scenario === 'chaos'));
  const date = profile.boards.survival[0].date;
  renameRun(profile, profile.boards.survival[0].seed, date, 'CMDR. TEST OTTER');
  assert.equal(profile.boards.survival[0].name, 'CMDR. TEST OTTER');
  resetScoreboard(profile);
  assert.equal(profile.boards.survival.length, 0);
});

test('cross-run achievements: the full roster', () => {
  const profile = defaultProfile();
  const base = { completed: true, chaos: false, survival: 50, systems: {}, minLevels: {}, cascadeFrom: [], blockedCascades: [], scenarioIds: ['power'], scenario: 'power', decisionsMade: 1, criticalFailures: 0, efficiency: 10, citizensProtected: 50 };
  for (const character of ['governor', 'scientist', 'engineer', 'medical', 'energy', 'logistics', 'ai']) {
    recordRun(profile, { ...base, character, seed: character, commander: 'CMDR. A B' });
  }
  assert.ok(profile.achievements['full-roster']);
  assert.ok(ACHIEVEMENT_BY_ID['full-roster'].secret);
});

test('storage: round trip, backup recovery and sanitizing of bad data', () => {
  const backend = new FakeStorage();
  const store = new ProfileStore(backend);
  const p = store.load();
  p.settings.muted = true;
  p.stats.runs = 3;
  store.save(p);
  p.stats.runs = 4;
  store.save(p);
  assert.equal(new ProfileStore(backend).load().stats.runs, 4);

  backend.setItem(STORAGE_KEY, '{not json');
  const recovered = new ProfileStore(backend).load();
  assert.equal(recovered.stats.runs, 3, 'backup used when the main save is corrupt');
  assert.equal(recovered.settings.muted, true);

  backend.setItem(STORAGE_KEY, JSON.stringify({ settings: { master: 7, muted: 'yes' }, boards: { survival: [{ value: 'x' }, { value: 88, name: 42, character: 'nope', scenario: 'water' }] }, stats: { runs: -5 } }));
  backend.removeItem(BACKUP_KEY);
  const clean = new ProfileStore(backend).load();
  assert.equal(clean.settings.master, 1);
  assert.equal(clean.settings.muted, false);
  assert.equal(clean.boards.survival.length, 1);
  assert.equal(clean.boards.survival[0].character, 'governor');
  assert.equal(clean.stats.runs, 0);
  assert.deepEqual(sanitizeProfile(null), defaultProfile());
});

test('storage falls back to memory when localStorage is unavailable', () => {
  const store = new ProfileStore();
  assert.equal(store.persistent, false);
  const p = store.load();
  assert.ok(store.save(p));
  assert.deepEqual(store.get(), p);
});
