/**
 * App-level session: what one visitor's play-through carries between screens (role, theme,
 * the run's config, the finished simulation and its report). The persistent profile lives in
 * ./storage.js; nothing here survives a page reload, by design (quick exhibition resets).
 */
import { profileStore } from './storage.js';

const params = new URLSearchParams(globalThis.location?.search || '');

export const session = {
  character: null,
  scenario: null,
  surprise: false,
  config: null,
  sim: null,
  report: null,
  recorded: null,
  tutorialSeen: false,
  runs: 0
};

/** Forget the current visitor's picks and run (RESET). */
export function resetSession() {
  Object.assign(session, { character: null, scenario: null, surprise: false, config: null, sim: null, report: null, recorded: null, tutorialSeen: false });
}

export function settings() {
  return profileStore().get().settings;
}

/** Exhibition Mode: kiosk URL flag (?exhibition) or the setting. */
export function isExhibition() {
  return params.has('exhibition') || !!settings().exhibition;
}

export function reducedMotion() {
  return !!settings().reducedMotion || !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function isTestMode() {
  return params.has('test');
}
