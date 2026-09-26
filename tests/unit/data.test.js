// Data validation: the whole game is data-driven, so malformed data is the most likely bug.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, DECK, CASCADE_EVENT, EVENT_BY_ID } from '../../src/data/events/index.js';
import { SYSTEMS, SYSTEM_IDS } from '../../src/data/resources.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { SCENARIOS, CHAOS_TWISTS, PLAYABLE_THEMES } from '../../src/data/scenarios.js';
import { DISTRICT_BY_ID } from '../../src/data/city-layout.js';
import { RULES } from '../../src/sim/rules.js';
import { ABILITIES } from '../../src/sim/abilities.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';

const HAZARDS = new Set([null, 'fire', 'smoke', 'toxic', 'flood', 'glitch', 'sparks', 'crack', 'outage']);
const KINDS = new Set(['deck', 'followup', 'cascade', 'recovery']);
const EFFECT_KEYS = new Set([...SYSTEM_IDS, 'budget']);
const FLAGS = new Set(['repair-crew', 'contain-toxic']);
const ROLES = new Set(CHARACTERS.map((c) => c.id));
const THEMES = new Set([...SYSTEM_IDS, 'cyber', 'industrial', 'weather', 'infrastructure']);

const isInt = (v) => Number.isInteger(v);

test('event library: a large set of unique crises (30–50 in the random deck, plus cascades and follow-ups)', () => {
  assert.equal(new Set(EVENTS.map((e) => e.id)).size, EVENTS.length, 'duplicate event ids');
  const deckOnly = EVENTS.filter((e) => e.kind === 'deck');
  assert.ok(deckOnly.length >= 30 && deckOnly.length <= 50, `deck crises: ${deckOnly.length}`);
  assert.ok(DECK.length > deckOnly.length, 'recovery opportunities are drawable');
});

test('every crisis is well-formed', () => {
  for (const e of EVENTS) {
    const where = `event ${e.id}`;
    assert.ok(e.title && e.text && e.text.length < 140, `${where}: title/text`);
    assert.ok(DISTRICT_BY_ID[e.district], `${where}: district ${e.district}`);
    assert.ok(HAZARDS.has(e.hazard), `${where}: hazard ${e.hazard}`);
    assert.ok(KINDS.has(e.kind), `${where}: kind`);
    assert.ok([1, 2, 3].includes(e.severity), `${where}: severity`);
    assert.ok(typeof e.category === 'string' && e.category, `${where}: category`);
    assert.ok(e.weight > 0, `${where}: weight`);
    for (const t of e.themes) assert.ok(THEMES.has(t), `${where}: theme ${t}`);
    for (const [k, v] of Object.entries(e.impact)) assert.ok(SYSTEM_IDS.includes(k) && isInt(v) && v < 0, `${where}: impact ${k}`);
    for (const [k, v] of Object.entries(e.ignore || {})) assert.ok(SYSTEM_IDS.includes(k) && isInt(v) && v < 0, `${where}: ignore ${k}`);
    if (e.kind !== 'recovery') assert.ok(Object.keys(e.ignore || {}).length > 0, `${where}: ignoring a crisis must have consequences`);
    for (const [sys, op, v] of e.when) assert.ok(SYSTEM_IDS.includes(sys) && ['<', '>'].includes(op) && typeof v === 'number', `${where}: condition`);

    const general = e.choices.filter((c) => !c.role);
    assert.ok(general.length >= 2 && general.length <= 4, `${where}: 2–4 responses`);
    assert.ok(e.choices.length <= 4, `${where}: at most 4 responses on a card`);
    assert.equal(new Set(e.choices.map((c) => c.id)).size, e.choices.length, `${where}: duplicate choice ids`);
    for (const c of e.choices) {
      const cw = `${where}/${c.id}`;
      assert.ok(c.label && c.label.length <= 34, `${cw}: label`);
      assert.ok(Object.keys(c.effects).length > 0, `${cw}: effects`);
      for (const [k, v] of Object.entries(c.effects)) assert.ok(EFFECT_KEYS.has(k) && isInt(v) && v !== 0, `${cw}: effect ${k}`);
      assert.ok(isInt(c.cost) && c.cost >= 0 && c.cost <= 45, `${cw}: cost`);
      assert.ok(c.risk >= 0 && c.risk < 1, `${cw}: risk`);
      if (c.followUp) assert.ok(EVENT_BY_ID[c.followUp] && c.risk > 0, `${cw}: follow-up`);
      if (c.role) assert.ok(ROLES.has(c.role), `${cw}: role`);
      for (const f of c.flags) assert.ok(FLAGS.has(f), `${cw}: flag ${f}`);
      for (const l of c.lingering) assert.ok(SYSTEM_IDS.includes(l.system) && l.rate !== 0 && l.duration > 0, `${cw}: lingering`);
    }
  }
});

test('no response is a free lunch: every crisis option has a cost, side effect or risk', () => {
  for (const e of EVENTS.filter((x) => x.kind !== 'recovery')) {
    for (const c of e.choices) {
      const downside = c.cost > 0 || c.risk > 0 || Object.entries(c.effects).some(([k, v]) => k !== 'budget' && v < 0) || c.lingering.some((l) => l.rate < 0);
      assert.ok(downside, `${e.id}/${c.id} has no trade-off`);
    }
  }
});

test('every role has exclusive responses somewhere in the deck', () => {
  for (const role of ROLES) {
    const n = EVENTS.flatMap((e) => e.choices).filter((c) => c.role === role).length;
    assert.ok(n >= 2, `${role}: ${n} exclusive responses`);
  }
});

test('every system has a cascade crisis and every dependency points at a real system', () => {
  for (const id of SYSTEM_IDS) assert.ok(CASCADE_EVENT[id] && EVENT_BY_ID[CASCADE_EVENT[id]].kind === 'cascade', `cascade for ${id}`);
  for (const s of SYSTEMS) for (const d of s.dependsOn) assert.ok(SYSTEM_IDS.includes(d.source) && d.source !== s.id && d.strength > 0);
});

test('7 command roles, each with a working special ability and valid modifiers', () => {
  assert.equal(CHARACTERS.length, 7);
  for (const c of CHARACTERS) {
    assert.ok(ABILITIES[c.ability.id], `${c.id}: ability ${c.ability.id} implemented`);
    assert.ok(c.ability.charges >= 1 && c.ability.cooldown >= 0);
    assert.ok(c.strengths.length >= 2 && c.weakness, `${c.id}: card text`);
    for (const k of Object.keys(c.affinity)) assert.ok(SYSTEM_IDS.includes(k));
    for (const k of Object.keys(c.decayMult || {})) assert.ok(SYSTEM_IDS.includes(k));
    for (const k of Object.keys(c.resist || {})) assert.ok(SYSTEM_IDS.includes(k));
  }
});

test('10 crisis themes (incl. Chaos) with real mechanics', () => {
  assert.equal(SCENARIOS.length, 10);
  assert.equal(PLAYABLE_THEMES.length, 9);
  for (const s of SCENARIOS.filter((x) => !x.chaos)) {
    assert.ok(RULES[s.rule.id], `${s.id}: rule ${s.rule.id}`);
    assert.ok(EVENT_BY_ID[s.opening], `${s.id}: opening ${s.opening}`);
    assert.ok(Object.keys(s.decay).length > 0 && Object.keys(s.start).length > 0, `${s.id}: pressure and start`);
    for (const k of [...Object.keys(s.decay), ...Object.keys(s.start)]) assert.ok(SYSTEM_IDS.includes(k));
    assert.ok(s.systems.length >= 2 && s.difficulty >= 1 && s.difficulty <= 5);
  }
  for (const t of CHAOS_TWISTS) assert.ok(RULES[t.id], `twist ${t.id}`);
});

test('achievements: unique ids, 5 headline + secret ones, all checkable', () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const name of ['POWER BALANCER', 'NO ONE LEFT BEHIND', 'MASTER PLANNER', 'CHAOS SURVIVOR', 'ADAPTIVE COMMANDER']) {
    assert.ok(ACHIEVEMENTS.some((a) => a.name === name && !a.secret), name);
  }
  assert.ok(ACHIEVEMENTS.filter((a) => a.secret).length >= 3);
  for (const a of ACHIEVEMENTS) assert.equal(typeof a.check, 'function');
});
