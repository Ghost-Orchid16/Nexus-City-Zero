/**
 * Event authoring helpers. A crisis event is plain data:
 *
 * {
 *   id, title, text,              // text: 1–2 short sentences a child can read
 *   district,                     // where it happens (camera focus + card illustration)
 *   hazard,                       // map effect while active: fire|smoke|toxic|flood|glitch|sparks|crack|outage|null
 *   category,                     // crisis type for achievements / play-style analysis
 *   themes: [],                   // scenario themes that make it more likely
 *   weight, when: [[system, '<'|'>', value]], impact: { system: delta },
 *   severity: 1|2|3, kind: 'deck'|'followup'|'cascade'|'recovery',
 *   choices: [ choice… ],         // 2–4 (+ role-exclusive options)
 *   ignore: { system: delta }     // if nobody responds before the timer runs out
 * }
 *
 * choice = { id, label, effects, cost, tags, risk, followUp, lingering, role, flags }
 *   effects:   immediate deltas (budget may appear as a positive refund)
 *   cost:      emergency budget spent (the choice is unavailable if you cannot afford it)
 *   risk:      probability that `followUp` (another event id) arrives a few seconds later
 *   lingering: [{ system, rate, duration }] slow change over time after the choice
 *   role:      only offered to that command role
 */
export function choice(id, label, effects, cost = 0, opts = {}) {
  return { id, label, effects, cost, tags: [], risk: 0, followUp: null, lingering: [], role: null, flags: [], ...opts };
}

export function crisis(def) {
  return { weight: 1, when: [], impact: {}, severity: 2, kind: 'deck', themes: [], hazard: null, ...def };
}
