/**
 * The local profile: settings, achievements and the scoreboard (no accounts, all local).
 * Pure functions over plain data, so they are unit-tested in Node; persistence lives in
 * ./storage.js.
 */
import { ACHIEVEMENTS } from '../data/achievements.js';
import { CHARACTER_BY_ID } from '../data/characters.js';
import { SCENARIO_BY_ID } from '../data/scenarios.js';

export const PROFILE_VERSION = 1;
export const BOARD_SIZE = 5;

/** Scoreboard categories (see the spec's LOCAL SCOREBOARD list). */
export const BOARDS = [
  { id: 'survival', title: 'HIGHEST SURVIVAL', unit: '%', better: 'high', value: (r) => r.survival, eligible: () => true },
  { id: 'citizens', title: 'CITIZENS PROTECTED', unit: '%', better: 'high', value: (r) => r.citizensProtected, eligible: (r) => r.completed },
  { id: 'efficiency', title: 'RESOURCE EFFICIENCY', unit: '', better: 'high', value: (r) => r.efficiency, eligible: (r) => r.completed },
  { id: 'failures', title: 'FEWEST CRITICAL FAILURES', unit: '', better: 'low', value: (r) => r.criticalFailures, eligible: (r) => r.completed },
  { id: 'chaos', title: 'CHAOS MODE VICTORIES', unit: '%', better: 'high', value: (r) => r.survival, eligible: (r) => r.completed && r.chaos }
];

export const DEFAULT_SETTINGS = {
  master: 0.8,
  music: 0.55,
  sfx: 0.85,
  muted: false,
  reducedMotion: false,
  exhibition: false,
  tutorial: true
};

export function defaultProfile() {
  return {
    version: PROFILE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    achievements: {},
    boards: Object.fromEntries(BOARDS.map((b) => [b.id, []])),
    rolesPlayed: [],
    themesPlayed: [],
    stats: { runs: 0, completed: 0, collapsed: 0, chaosWins: 0, decisions: 0 }
  };
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const str = (v, max = 40) => (typeof v === 'string' ? v.slice(0, max) : '');

function cleanEntry(e) {
  if (!e || typeof e !== 'object' || !isNum(e.value)) return null;
  return {
    name: str(e.name) || 'CMDR. UNKNOWN',
    value: e.value,
    survival: isNum(e.survival) ? e.survival : 0,
    character: CHARACTER_BY_ID[e.character] ? e.character : 'governor',
    scenario: SCENARIO_BY_ID[e.scenario] ? e.scenario : 'power',
    date: str(e.date, 30),
    seed: str(String(e.seed ?? ''), 40)
  };
}

/** Validate and repair anything read from storage (never trust saved data). */
export function sanitizeProfile(raw) {
  const p = defaultProfile();
  if (!raw || typeof raw !== 'object') return p;
  const s = raw.settings || {};
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    const v = s[k];
    if (typeof def === 'boolean' && typeof v === 'boolean') p.settings[k] = v;
    if (typeof def === 'number' && isNum(v)) p.settings[k] = Math.min(1, Math.max(0, v));
  }
  for (const a of ACHIEVEMENTS) {
    const v = raw.achievements?.[a.id];
    if (v && typeof v === 'object') p.achievements[a.id] = { at: str(v.at, 30), by: str(v.by) };
  }
  for (const b of BOARDS) {
    const list = Array.isArray(raw.boards?.[b.id]) ? raw.boards[b.id] : [];
    p.boards[b.id] = sortBoard(b, list.map(cleanEntry).filter(Boolean)).slice(0, BOARD_SIZE);
  }
  p.rolesPlayed = [...new Set((raw.rolesPlayed || []).filter((id) => CHARACTER_BY_ID[id]))];
  p.themesPlayed = [...new Set((raw.themesPlayed || []).filter((id) => SCENARIO_BY_ID[id]))];
  for (const k of Object.keys(p.stats)) if (isNum(raw.stats?.[k]) && raw.stats[k] >= 0) p.stats[k] = Math.floor(raw.stats[k]);
  return p;
}

/** Old save formats are upgraded step by step (version → migration to version + 1). */
const MIGRATIONS = {};

export function migrateProfile(raw) {
  let data = raw;
  let version = isNum(data?.version) ? data.version : PROFILE_VERSION;
  while (version < PROFILE_VERSION && MIGRATIONS[version]) {
    data = MIGRATIONS[version](data);
    version++;
  }
  return sanitizeProfile(data);
}

function sortBoard(board, list) {
  const dir = board.better === 'high' ? -1 : 1;
  return [...list].sort((a, b) => dir * (a.value - b.value) || b.survival - a.survival);
}

/**
 * Record a finished run: scoreboard, achievements, stats. Mutates and returns the profile
 * plus what changed (for the results screen).
 */
export function recordRun(profile, report, { name = report.commander, date = new Date().toISOString() } = {}) {
  if (!profile.rolesPlayed.includes(report.character)) profile.rolesPlayed.push(report.character);
  for (const id of report.scenarioIds || [report.scenario]) if (!profile.themesPlayed.includes(id)) profile.themesPlayed.push(id);
  if (report.chaos && !profile.themesPlayed.includes('chaos')) profile.themesPlayed.push('chaos');
  profile.stats.runs++;
  if (report.completed) profile.stats.completed++;
  else profile.stats.collapsed++;
  if (report.completed && report.chaos) profile.stats.chaosWins++;
  profile.stats.decisions += report.decisionsMade;

  const placements = [];
  for (const b of BOARDS) {
    if (!b.eligible(report)) continue;
    const entry = { name, value: b.value(report), survival: report.survival, character: report.character, scenario: report.scenario, date, seed: String(report.seed) };
    const list = sortBoard(b, [...profile.boards[b.id], entry]).slice(0, BOARD_SIZE);
    const rank = list.indexOf(entry);
    profile.boards[b.id] = list;
    if (rank >= 0) placements.push({ board: b.id, title: b.title, rank: rank + 1, value: entry.value });
  }

  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (profile.achievements[a.id]) continue;
    if (a.check(report, profile)) {
      profile.achievements[a.id] = { at: date, by: name };
      unlocked.push(a.id);
    }
  }
  return { profile, placements, unlocked };
}

/** Rename the latest scoreboard entries of this run (the results screen can re-roll the name). */
export function renameRun(profile, seed, date, name) {
  for (const list of Object.values(profile.boards)) {
    for (const e of list) if (e.seed === String(seed) && e.date === date) e.name = name;
  }
  for (const a of Object.values(profile.achievements)) if (a.at === date) a.by = name;
  return profile;
}

export function resetScoreboard(profile) {
  profile.boards = Object.fromEntries(BOARDS.map((b) => [b.id, []]));
  profile.achievements = {};
  profile.rolesPlayed = [];
  profile.themesPlayed = [];
  profile.stats = defaultProfile().stats;
  return profile;
}
