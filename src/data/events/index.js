// The crisis event library (data only). See ./helpers.js for the schema.
import energy from './energy.js';
import water from './water.js';
import health from './health.js';
import transport from './transport.js';
import infrastructure from './infrastructure.js';
import { safety, cyber } from './safety-cyber.js';
import { supplies, industrial } from './supplies-industrial.js';
import { weather, recovery } from './weather-recovery.js';
import cascades from './cascades.js';

export const EVENTS = [
  ...energy, ...water, ...health, ...transport, ...infrastructure,
  ...safety, ...cyber, ...supplies, ...industrial, ...weather, ...recovery, ...cascades
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

/** Events the director may draw at random (follow-ups and cascades are raised by rules). */
export const DECK = EVENTS.filter((e) => e.kind === 'deck' || e.kind === 'recovery');

export const CASCADE_EVENT = Object.fromEntries(cascades.map((e) => [e.id.replace('cascade-', ''), e.id]));

/** Distinct crisis categories (for the "responded to many crisis types" achievement). */
export const CATEGORIES = [...new Set(EVENTS.map((e) => e.category))];
